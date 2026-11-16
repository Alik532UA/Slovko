/**
 * Отримання відгуків користувачів щодо слів із Cloud Firestore.
 *
 * Використання:
 *   node scripts/fetch-word-feedback.mjs
 *   npm run feedback:fetch
 *   node scripts/fetch-word-feedback.mjs --mark-resolved 2026-05-12-08-42-16-nleod
 *   node scripts/fetch-word-feedback.mjs --sync-remote
 *
 * Без зовнішніх npm-залежностей — використовує стандартні модулі Node.js та REST API.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSign } from "node:crypto";

const REGISTRY_PATH = resolve(".private/notes/feedback/word_error/registry.json");
const OUTPUT_MD_PATH = resolve(".private/notes/feedback/word_error/pending_review.md");
const PRIVATE_DIR = resolve(".private");

// 1. Пошук ключа сервісного акаунта
function findKeyFile() {
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
		return process.env.GOOGLE_APPLICATION_CREDENTIALS;
	}

	if (existsSync(PRIVATE_DIR)) {
		const files = readdirSync(PRIVATE_DIR);
		const match = files.find((f) => f.includes("firebase-adminsdk") && f.endsWith(".json"));
		if (match) return resolve(PRIVATE_DIR, match);
		if (files.includes("serviceAccountKey.json")) return resolve(PRIVATE_DIR, "serviceAccountKey.json");
	}

	return null;
}

const keyPath = findKeyFile();
if (!keyPath) {
	console.error("\x1b[31m[Помилка] Не знайдено ключ сервісного акаунта Firebase.\x1b[0m");
	console.error("Покладіть json-ключ у .private/ (наприклад .private/serviceAccountKey.json)");
	process.exit(1);
}

const key = JSON.parse(readFileSync(keyPath, "utf8"));
const PROJECT_ID = key.project_id || "slovko-alik532";

const base64url = (s) =>
	Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// 2. Отримання OAuth2 токена доступу
async function getAccessToken() {
	const now = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claims = base64url(
		JSON.stringify({
			iss: key.client_email,
			scope: "https://www.googleapis.com/auth/datastore",
			aud: "https://oauth2.googleapis.com/token",
			iat: now,
			exp: now + 3600,
		}),
	);

	const sign = createSign("RSA-SHA256");
	sign.update(`${header}.${claims}`);
	const assertion = `${header}.${claims}.${sign.sign(key.private_key, "base64url")}`;

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});

	const body = await res.json();
	if (!res.ok) {
		throw new Error(`Помилка аутентифікації OAuth: ${res.status} ${JSON.stringify(body)}`);
	}
	return body.access_token;
}

// 3. Декодування Firestore REST API типів даних
function decodeValue(val) {
	if (!val) return null;
	if ("stringValue" in val) return val.stringValue;
	if ("booleanValue" in val) return val.booleanValue;
	if ("integerValue" in val) return parseInt(val.integerValue, 10);
	if ("doubleValue" in val) return val.doubleValue;
	if ("timestampValue" in val) return val.timestampValue;
	if ("nullValue" in val) return null;
	if ("mapValue" in val) {
		const res = {};
		const fields = val.mapValue.fields || {};
		for (const [k, v] of Object.entries(fields)) {
			res[k] = decodeValue(v);
		}
		return res;
	}
	if ("arrayValue" in val) {
		const values = val.arrayValue.values || [];
		return values.map(decodeValue);
	}
	return null;
}

function decodeDoc(doc) {
	const id = doc.name.split("/").pop();
	const data = { id, _fullPath: doc.name, createTime: doc.createTime, updateTime: doc.updateTime };
	if (doc.fields) {
		for (const [k, v] of Object.entries(doc.fields)) {
			data[k] = decodeValue(v);
		}
	}
	return data;
}

// 4. Отримання документів з колекції (з пагінацією)
async function fetchCollection(token, collectionPath) {
	const docs = [];
	let pageToken = null;

	do {
		const url = new URL(
			`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}`,
		);
		url.searchParams.set("pageSize", "100");
		if (pageToken) url.searchParams.set("pageToken", pageToken);

		const res = await fetch(url.toString(), {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (res.status === 404) return [];
		const data = await res.json();
		if (!res.ok) {
			throw new Error(`Firestore API error [${collectionPath}]: ${res.status} ${JSON.stringify(data)}`);
		}

		if (data.documents) {
			for (const rawDoc of data.documents) {
				docs.push(decodeDoc(rawDoc));
			}
		}
		pageToken = data.nextPageToken;
	} while (pageToken);

	return docs;
}

// Оновлення статусу документа у Firestore
async function updateRemoteStatus(token, fullDocPath, newStatus) {
	const url = `https://firestore.googleapis.com/v1/${fullDocPath}?updateMask.fieldPaths=status`;
	const res = await fetch(url, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			fields: {
				status: { stringValue: newStatus },
			},
		}),
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Не вдалося оновити ${fullDocPath}: ${res.status} ${err}`);
	}
}

// 5. Завантаження та збереження локального реєстру
function loadRegistry() {
	if (!existsSync(REGISTRY_PATH)) return {};
	try {
		return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
	} catch {
		return {};
	}
}

function saveRegistry(registry) {
	mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
	writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

// 6. Форматування для аналізу AI
function formatReportForAI(items) {
	const header = `---
title: Звіт для перевірки помилок перекладу слів
date: ${new Date().toISOString().split("T")[0]}
status: pending_review
total_items: ${items.length}
---

# Інструкція для AI перед аналізом:
1. Ознайомся з правилами у \`.read_for_AI/languages_03/01_Acceptance_Criteria.md\` та \`.read_for_AI/languages_03/FEEDBACK_VERIFICATION_GUIDE.md\`.
2. Перевір крос-мовну узгодженість (як цей самий ключ перекладено в EN, UK, DE, PL, NL, ES).
3. Перевір, чи це не полісемія (розщеплення в \`src/lib/data/semantics.ts\` замість перезапису).
4. Якщо ключ відсутній у \`src/lib/data/translations/\` — вкажи, що це raw fallback і переклад треба додати для ВСІХ мов.
5. Надай чіткий висновок: ПІДТВЕРДЖЕНО (і точний json-патч) або ВІДХИЛЕНО (із зазначенням причини).

## Список відгуків для перевірки (${items.length}):

`;

	const body = items
		.map((item, index) => {
			const lang = item.context?.language || {};
			const level = item.context?.currentLevel || item.context?.level || "не вказано";
			const topic = item.context?.currentTopic || item.context?.topic || "не вказано";
			const mode = item.context?.mode || "topics";
			const ts = item.timestamp || item.createTime || "";

			return `### [${index + 1}] ID: \`${item.id}\`
- **Ключ слова (wordKey):** \`${item.wordKey}\`
- **Мовна пара:** \`${lang.source || item.source || "?"}\` -> \`${lang.target || item.target || "?"}\` (інтерфейс: \`${lang.interface || item.interface || "?"}\`)
- **Контекст:** Режим: \`${mode}\` | Рівень: \`${Array.isArray(level) ? level.join(", ") : level}\` | Тема: \`${Array.isArray(topic) ? topic.join(", ") : topic}\`
- **Повідомлено користувачем:**
  - Переклад джерела: \`${item.sourceTranslation || ""}\`
  - Переклад цілі: \`${item.targetTranslation || ""}\`
  - Тип помилки: \`${item.errorType || "wrongTranslation"}\`
  - Коментар: ${item.comment ? `"${item.comment}"` : "*(порожньо)*"}
- **Дата:** ${ts}
- **Джерело:** \`${item._collection}\`
`;
		})
		.join("\n---\n\n");

	return header + body;
}

// 7. Головна функція
async function main() {
	const args = process.argv.slice(2);
	const markResolvedArg = args.find((a) => a.startsWith("--mark-resolved="));
	const markResolvedAll = args.includes("--mark-resolved-all");
	const markIgnoredArg = args.find((a) => a.startsWith("--mark-ignored="));
	const syncRemote = args.includes("--sync-remote");

	const registry = loadRegistry();

	if (markResolvedAll) {
		let count = 0;
		for (const id of Object.keys(registry)) {
			if (registry[id].status === "pending") {
				registry[id].status = "resolved";
				registry[id].resolvedAt = new Date().toISOString();
				count++;
			}
		}
		saveRegistry(registry);
		console.log(`\x1b[32mПозначено ${count} тікетів як resolved у реєстрі.\x1b[0m`);
		return;
	}

	// Ручна позначка статусу через аргументи
	if (markResolvedArg) {
		const ids = markResolvedArg.split("=")[1].split(",");
		for (const id of ids) {
			if (registry[id]) {
				registry[id].status = "resolved";
				registry[id].resolvedAt = new Date().toISOString();
				console.log(`Позначено як resolved: ${id}`);
			}
		}
		saveRegistry(registry);
		return;
	}

	if (markIgnoredArg) {
		const ids = markIgnoredArg.split("=")[1].split(",");
		for (const id of ids) {
			if (registry[id]) {
				registry[id].status = "ignored";
				registry[id].ignoredAt = new Date().toISOString();
				console.log(`Позначено як ignored: ${id}`);
			}
		}
		saveRegistry(registry);
		return;
	}

	console.log(`\x1b[36m[Feedback] Отримання токена для проєкту ${PROJECT_ID}...\x1b[0m`);
	const token = await getAccessToken();

	console.log("[Feedback] Завантаження документів із Firestore...");
	const collections = [
		{ name: "feedback/word_error/messages", type: "registered" },
		{ name: "feedback_anonymous/word_error/messages", type: "anonymous" },
	];

	const allDocs = [];
	for (const col of collections) {
		try {
			const docs = await fetchCollection(token, col.name);
			docs.forEach((d) => (d._collection = col.name));
			allDocs.push(...docs);
			console.log(`  - ${col.name}: знайдено ${docs.length} документів`);
		} catch (e) {
			console.warn(`  - ${col.name}: помилка читання (${e.message})`);
		}
	}

	let newPendingCount = 0;
	let autoIgnoredCount = 0;
	let alreadyProcessedCount = 0;
	const pendingDocs = [];

	for (const doc of allDocs) {
		const id = doc.id;
		const wordKey = doc.wordKey || "";
		const isCustom = wordKey.startsWith("custom:") || wordKey.includes("custom-") || doc.context?.mode === "playlists";

		if (!registry[id]) {
			if (isCustom) {
				// Автоматично відфільтровуємо власні плейлісти користувачів
				registry[id] = {
					id,
					wordKey,
					status: "ignored",
					reason: "Користувацький плейліст (власне слово користувача, не базовий словник)",
					timestamp: doc.timestamp || doc.createTime,
					processedAt: new Date().toISOString(),
				};
				autoIgnoredCount++;
			} else {
				registry[id] = {
					id,
					wordKey,
					status: "pending",
					timestamp: doc.timestamp || doc.createTime,
					firstSeen: new Date().toISOString(),
				};
				pendingDocs.push(doc);
				newPendingCount++;
			}
		} else {
			if (registry[id].status === "pending") {
				pendingDocs.push(doc);
			} else {
				alreadyProcessedCount++;
			}
		}

		// Якщо користувач попросив синхронізувати статус із базою
		if (syncRemote && registry[id]?.status && registry[id].status !== "new" && doc.status !== registry[id].status) {
			try {
				await updateRemoteStatus(token, doc._fullPath, registry[id].status);
				console.log(`  [Remote Sync] Оновлено ${id} -> ${registry[id].status}`);
			} catch (err) {
				console.warn(`  [Remote Sync] Помилка: ${err.message}`);
			}
		}
	}

	saveRegistry(registry);

	console.log("\n\x1b[32m[Підсумок]:\x1b[0m");
	console.log(`  - Усього завантажено: ${allDocs.length}`);
	console.log(`  - Раніше опрацьовано (пропущено): ${alreadyProcessedCount}`);
	console.log(`  - Автоматично проігноровано (кастомні плейлісти): ${autoIgnoredCount}`);
	console.log(`  - Нових для перевірки (pending): ${newPendingCount}`);
	console.log(`  - Усього очікують рев'ю зараз: ${pendingDocs.length}`);

	if (pendingDocs.length > 0) {
		const mdContent = formatReportForAI(pendingDocs);
		writeFileSync(OUTPUT_MD_PATH, mdContent, "utf8");
		console.log(`\n\x1b[33m[Готово] Звіт для AI збережено у:\x1b[0m\n  ${OUTPUT_MD_PATH}`);
		console.log("\nВи можете передати цей файл на аналіз моделі!");
	} else {
		console.log("\n\x1b[32mНемає нових відгуків, які потребують перевірки!\x1b[0m");
	}
}

main().catch((err) => {
	console.error("\x1b[31m[Помилка виконання]:\x1b[0m", err);
	process.exit(1);
});
