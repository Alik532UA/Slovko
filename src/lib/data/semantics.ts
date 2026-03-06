export interface SemanticGroup {
	base: string;
	specific: string[];
}

/**
 * Центральний реєстр семантичних зв'язків (Schema).
 * Визначає, які специфічні ключі відносяться до яких базових понять.
 */
export const semanticHierarchy: Record<string, SemanticGroup> = {
	brother: {
		base: "brother",
		specific: ["brother_older", "brother_younger"],
	},
	sister: {
		base: "sister",
		specific: ["sister_older", "sister_younger"],
	},
	orange: {
		base: "orange",
		specific: ["orange_color", "orange_fruit"],
	},
	aunt: {
		base: "aunt",
		specific: ["aunt_paternal", "aunt_maternal"],
	},
	uncle: {
		base: "uncle",
		specific: ["uncle_paternal", "uncle_maternal"],
	},
	leg: {
		base: "leg",
		specific: ["leg_full", "foot"],
	},
	pronoun_3rd: {
		base: "pronoun_3rd",
		specific: ["he_pronoun", "she_pronoun", "it_pronoun"],
	},
	blue_group: {
		base: "blue",
		specific: ["blue_dark", "blue_light"],
	},
	walk: {
		base: "walk",
		specific: ["walk_step", "walk_stroll"],
	},
	go: {
		base: "go",
		specific: ["go_foot", "go_vehicle"],
	},
	you: {
		base: "you_pronoun",
		specific: ["you_informal", "you_formal", "you"],
	},
	free: {
		base: "free",
		specific: ["free_liberty", "free_gratis"],
	},
	affair: {
		base: "affair",
		specific: ["affair_matter", "affair_romance"],
	},
	back: {
		base: "back",
		specific: ["back_body", "back_direction"],
	},
	fine: {
		base: "fine",
		specific: ["fine_good", "fine_penalty"],
	},
	time: {
		base: "time",
		specific: ["time_abstract", "time_clock"],
	},
	man: {
		base: "man",
		specific: ["man", "husband"],
	},
	woman: {
		base: "woman",
		specific: ["woman", "wife"],
	},
	warm_group: {
		base: "warm",
		specific: ["hot", "warm"],
	},
	get_take_group: {
		base: "get",
		specific: ["get", "take"],
	},
	watch: {
		base: "watch",
		specific: ["watch_verb", "watch_clock"],
	},
	right: {
		base: "right",
		specific: ["right_direction", "right_correct"],
	},
	hard: {
		base: "hard",
		specific: ["hard_difficult", "hard_solid", "hard_tough"],
	},
	too: {
		base: "too",
		specific: ["too_also", "too_excessive"],
	},
	bear: {
		base: "bear",
		specific: ["bear_animal", "bear_endure"],
	},
	spring: {
		base: "spring",
		specific: ["spring_season"],
	},
	cool: {
		base: "cool",
		specific: ["cool_awesome", "cool_temp"],
	},
	match: {
		base: "match",
		specific: ["match_game", "match_fire"],
	},
	mean: {
		base: "mean",
		specific: ["mean_verb"],
	},
	kind: {
		base: "kind",
		specific: ["kind_nice", "kind_type"],
	},
	light: {
		base: "light",
		specific: ["light_brightness", "light_weight", "light_color"],
	},
	ring: {
		base: "ring",
		specific: ["ring_jewel", "ring_sound"],
	},
	lie: {
		base: "lie",
		specific: ["lie_position", "lie_false"],
	},
	point: {
		base: "point",
		specific: ["point_dot", "point_essence", "point_out"],
	},
	bank: {
		base: "bank",
		specific: ["bank_finance"],
	},
	jam: {
		base: "jam",
		specific: ["jam_fruit", "jam_traffic"],
	},
	bat: {
		base: "bat",
		specific: ["bat_animal"],
	},
	park: {
		base: "park",
		specific: ["park_area"],
	},
	duck: {
		base: "duck",
		specific: ["duck_animal"],
	},
	letter: {
		base: "letter",
		specific: ["letter_mail"],
	},
	different: {
		base: "different",
		specific: ["different_other", "different_various"],
	},
	at: {
		base: "at",
		specific: ["at_place", "at_time"],
	},
	from: {
		base: "from",
		specific: ["from_origin", "from_time"],
	},
	leave: {
		base: "leave",
		specific: ["leave_depart", "leave_behind"],
	},
	call: {
		base: "call",
		specific: ["call_phone", "call_name"],
	},
	number: {
		base: "number",
		specific: ["number_digit", "number_item"],
	},
	picture: {
		base: "picture",
		specific: ["picture_photo", "picture_painting"],
	},
	nicely: {
		base: "nicely",
		specific: ["nicely_kindly", "nicely_well"],
	},
	definitely: {
		base: "definitely",
		specific: ["definitely_certainly", "definitely_exactly"],
	},
	as_conjunction: {
		base: "as_conjunction",
		specific: ["as_like", "as_since"],
	},
	by_preposition: {
		base: "by_preposition",
		specific: ["by_near", "by_agent"],
	},
	design_verb: {
		base: "design_verb",
		specific: ["design_plan", "design_style"],
	},
	cousin: {
		base: "cousin",
		specific: ["cousin_male", "cousin_female"],
	},
	left_a2: {
		base: "left",
		specific: ["left_direction", "left_remaining"],
	},
	mad_angry: {
		base: "mad_angry",
		specific: ["mad_insane", "mad_angry"],
	},
	burn: {
		base: "burn",
		specific: ["burn_fire", "burn_injury"],
	},
	also: {
		base: "also",
		specific: ["also_too", "also_addition"],
	},
	before: {
		base: "before",
		specific: ["before_time", "before_position"],
	},
	so_adv: {
		base: "so_adv",
		specific: ["so_degree", "so_conjunction"],
	},
	give_up_habit: {
		base: "give_up_habit",
		specific: ["give_up_quit", "give_up_surrender"],
	},
	grow_up: {
		base: "grow_up",
		specific: ["grow_up_mature", "grow_up_physical"],
	},
	lady: {
		base: "lady",
		specific: ["lady_noble", "lady_woman"],
	},
	effect: {
		base: "effect",
		specific: ["effect_result", "effect_influence"],
	},
	failure: {
		base: "failure",
		specific: ["failure_lack", "failure_defeat"],
	},
	fault: {
		base: "fault",
		specific: ["fault_blame", "fault_defect"],
	},
	growth: {
		base: "growth",
		specific: ["growth_physical", "growth_development"],
	},
	sight: {
		base: "sight",
		specific: ["sight_vision", "sight_view"],
	},
	argument: {
		base: "argument",
		specific: ["argument_reason", "argument_dispute"],
	},
	appearance: {
		base: "appearance",
		specific: ["appearance_look", "appearance_arrival"],
	},
	authority: {
		base: "authority",
		specific: ["authority_power", "authority_expert", "authority_person"],
	},
	confidence: {
		base: "confidence",
		specific: ["confidence_trust", "confidence_assurance"],
	},
	area_b1: {
		base: "area",
		specific: ["area_territory", "area_field"],
	},
	drug: {
		base: "drug",
		specific: ["drug_medicine", "drug_narcotic"],
	},
	tube: {
		base: "tube",
		specific: ["tube_subway", "tube_pipe"],
	},
	cabin: {
		base: "cabin",
		specific: ["cabin_ship", "cabin_plane"],
	},
	appointment: {
		base: "appointment",
		specific: ["appointment_job", "appointment_meeting"],
	},
	application: {
		base: "application",
		specific: ["application_request", "application_software"],
	},
	engagement: {
		base: "engagement",
		specific: ["engagement_involvement", "engagement_betrothal"],
	},
	assessment: {
		base: "assessment",
		specific: ["assessment_eval", "assessment_tax"],
	},
	establishment: {
		base: "establishment",
		specific: ["establishment_institution", "establishment_founding"],
	},
	arm: {
		base: "arm",
		specific: ["arm_body", "arm_weapon"],
	},
	battery: {
		base: "battery",
		specific: ["battery_electric", "battery_artillery"],
	},
	drug_group: {
		base: "drug",
		specific: ["drug_medicine", "drug_narcotic"],
	},
	scan: {
		base: "scan",
		specific: ["scan_medical", "scan_digital"],
	},
	abuse: {
		base: "abuse",
		specific: ["abuse_misuse", "abuse_insult"],
	},
	draft: {
		base: "draft",
		specific: ["draft_sketch", "draft_wind"],
	},
	attachment: {
		base: "attachment",
		specific: ["attachment_file", "attachment_emotion"],
	},
	comprehensive: {
		base: "comprehensive",
		specific: ["comprehensive_thorough", "comprehensive_inclusive"],
	},
	fundamental: {
		base: "fundamental",
		specific: ["fundamental_basic", "fundamental_essential"],
	},
	acknowledgement: {
		base: "acknowledgement",
		specific: ["acknowledgement_confirmation", "acknowledgement_recognition"],
	},
	enhancement: {
		base: "enhancement",
		specific: ["enhancement_improvement", "enhancement_augmentation"],
	},
	aberration: {
		base: "aberration",
		specific: ["aberration_deviation", "aberration_mental"],
	},
	abolish: {
		base: "abolish",
		specific: ["abolish_law", "abolish_system"],
	},
	accord: {
		base: "accord",
		specific: ["accord_agreement", "accord_harmony"],
	},
	adjustment: {
		base: "adjustment",
		specific: ["adjustment_change", "adjustment_setting"],
	},
};

/**
 * Знаходить базовий ключ для специфічного ключа, якщо він існує в ієрархії.
 */
export function getBaseKey(key: string): string | null {
	for (const group of Object.values(semanticHierarchy)) {
		if (group.specific.includes(key)) {
			return group.base;
		}
	}
	return null;
}

/**
 * Отримує групу за базовим ключем.
 */
export function getSemanticGroup(baseKey: string): SemanticGroup | null {
	return semanticHierarchy[baseKey] || null;
}
