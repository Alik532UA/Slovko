// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Логер: редакція PII і невразливість до сховища.
 *
 * SECURITY-v8 § 10 і DEBUGGING-v8 § 1.4 вимагають, щоб редакцію робив САМ
 * логер, а не місця виклику. До 2026-08-16 у проєкті було навпаки: чистився
 * лише `logToRemote`, а буфер, дзеркало в sessionStorage і звіт, який
 * користувач копіює й надсилає третій особі, не чистилися взагалі.
 *
 * Мок `$app/environment` містить ОБИДВА поля, які читає модуль: без `dev`
 * гілка `shouldLog` пішла б іншим шляхом мовчки (CODE-QUALITY-v8 § 3.2).
 */

const storage = new Map<string, string>();
let failNextWrite = false;
let writeAttempts = 0;

vi.mock('$app/environment', () => ({ browser: true, dev: false }));

vi.mock('./storage/storageProvider', () => ({
	sessionStorageProvider: {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			writeAttempts += 1;
			if (failNextWrite) return false;
			storage.set(key, value);
			return true;
		}
	}
}));

vi.stubGlobal('window', {} as unknown as Window);

const { logService } = await import('./logService.svelte');

/** Останній запис буфера — те, що поїде і в дзеркало, і у звіт. */
function lastRecord(): string {
	const all = logService.getRecentLogs().split('\n');
	return all[all.length - 1];
}

describe('редакція PII у логері (DEBUGGING-v8 § 1.4)', () => {
	beforeEach(() => {
		failNextWrite = false;
		writeAttempts = 0;
	});

	it('перевірка жива: запис справді потрапляє в буфер', () => {
		logService.log('debug', 'канарка');
		expect(lastRecord()).toContain('канарка');
	});

	it('поля email, token і password не потрапляють у буфер', () => {
		logService.log('debug', 'профіль', {
			uid: 'abc123',
			email: 'john.doe@example.com',
			token: 'eyJhbGciOi.SECRET.value',
			nested: { password: 'hunter2' }
		});

		const record = lastRecord();
		expect(record, 'uid не персональний — його ховати не треба').toContain('abc123');
		expect(record).not.toContain('john.doe@example.com');
		expect(record).not.toContain('eyJhbGciOi.SECRET.value');
		expect(record).not.toContain('hunter2');
	});

	it('адреса всередині вільного тексту маскується', () => {
		logService.log('debug', 'Вхід: john.doe@example.com');
		const record = lastRecord();
		expect(record).not.toContain('john.doe@example.com');
		expect(record, 'домен лишається — за ним видно, який це провайдер').toContain('j***@example.com');
	});

	it('секрет у параметрах адреси не зберігається', () => {
		logService.log('debug', 'redirect', 'https://site.test/cb?state=xy&code=SECRET-CODE&safe=1');
		const record = lastRecord();
		expect(record).not.toContain('SECRET-CODE');
		expect(record, 'нешкідливі параметри лишаються').toContain('safe=1');
	});

	it('Error серіалізується читабельно, а не як порожній обʼєкт', () => {
		logService.error('debug', 'збій', new Error('Пошта bob@example.com недоступна'));
		const record = lastRecord();
		expect(record).toContain('Error:');
		expect(record).not.toContain('bob@example.com');
	});
});

describe('логер не має права зламати застосунок (DEBUGGING-v8 § 1.5)', () => {
	beforeEach(() => {
		failNextWrite = false;
		writeAttempts = 0;
	});

	it('відмова сховища не кидає назовні', () => {
		failNextWrite = true;
		expect(() => logService.log('debug', 'подія при переповненому сховищі')).not.toThrow();
	});

	it('після відмови дзеркалення вимикається до кінця сесії', () => {
		failNextWrite = true;
		logService.log('debug', 'перша відмова');
		const attemptsAfterFailure = writeAttempts;

		failNextWrite = false;
		logService.log('debug', 'наступна подія');
		logService.log('debug', 'і ще одна');

		expect(
			writeAttempts,
			'логер продовжує довбати сховище, яке вже відмовило'
		).toBe(attemptsAfterFailure);
	});

	it('буфер у памʼяті продовжує працювати без дзеркала', () => {
		expect(lastRecord()).toContain('і ще одна');
	});
});
