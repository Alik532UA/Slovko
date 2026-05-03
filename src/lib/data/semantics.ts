import type { SemanticGroup } from "../types";

/**
 * Центральний реєстр семантичних зв'язків (Schema).
 * Визначає, які специфічні ключі відносяться до яких базових понять.
 */
export const semanticHierarchy: Record<string, SemanticGroup> = {
	aberration: {
		base: "aberration",
		specific: ["aberration_deviation", "aberration_mental"]
	},
	abolish: {
		base: "abolish",
		specific: ["abolish_law", "abolish_system"]
	},

	above: {
		base: "above",
		specific: ["above_position", "above_mention"]
	},
	abuse: {
		base: "abuse",
		specific: ["abuse_insult", "abuse_misuse"]
	},
	accident: {
		base: "accident",
		specific: ["accident_chance", "accident_event"]
	},
	accommodation: {
		base: "accommodation",
		specific: ["accommodation_living", "accommodation_yerleme"]
	},
	accord: {
		base: "accord",
		specific: ["accord_agreement", "accord_harmony"]
	},
	account_for: {
		base: "account_for",
		specific: ["account_for_verb"]
	},
	accretion: {
		base: "accretion",
		specific: ["accretion_growth", "accretion_buildup"]
	},
	acerbic: {
		base: "acerbic",
		specific: ["acerbic_ac", "acerbic_herb"]
	},
	acknowledge: {
		base: "acknowledge",
		specific: ["acknowledge_receipt", "acknowledge_recognize"]
	},
	acknowledgement: {
		base: "acknowledgement",
		specific: ["acknowledgement_confirmation", "acknowledgement_recognition"]
	},
	acquire: {
		base: "acquire",
		specific: ["acquire_knowledge", "acquire_obtain"]
	},
	acrimony: {
		base: "acrimony",
		specific: ["acrimony_bitterness", "acrimony_malice"]
	},
	action: {
		base: "action",
		specific: ["action_doing", "action_legal"]
	},
	actual: {
		base: "actual",
		specific: ["actual_current", "actual_real"]
	},
	adamant: {
		base: "adamant",
		specific: ["adamant_stubborn", "adamant_firm"]
	},
	address: {
		base: "address",
		specific: ["address_noun", "address_verb"]
	},
	adjustment: {
		base: "adjustment",
		specific: ["adjustment_change", "adjustment_setting"]
	},
	administer: {
		base: "administer",
		specific: ["administer_justice", "administer_manage"]
	},
	admit: {
		base: "admit",
		specific: ["admit_verb"]
	},
	adversity: {
		base: "adversity",
		specific: ["adversity_hardship", "adversity_misfortune"]
	},
	advocacy: {
		base: "advocacy",
		specific: ["advocacy_protection", "advocacy_qoralav"]
	},
	advocate: {
		base: "advocate",
		specific: ["advocate_advocate", "advocate_cause", "advocate_lawyer", "advocate_verb"]
	},
	affair: {
		base: "affair",
		specific: ["affair_matter", "affair_romance"]
	},
	affinity: {
		base: "affinity",
		specific: ["affinity_affinity", "affinity_yaqnlq"]
	},
	affirm: {
		base: "affirm",
		specific: ["affirm_statement"]
	},
	allowance: {
		base: "allowance",
		specific: ["allowance_maa", "allowance_money"]
	},
	also: {
		base: "also",
		specific: ["also_addition", "also_too"]
	},
	alter: {
		base: "alter",
		specific: ["alter_change", "alter_plans"]
	},
	amend: {
		base: "amend",
		specific: ["amend_law"]
	},
	amiss: {
		base: "amiss",
		specific: ["amiss__", "amiss_amiss"]
	},
	and: {
		base: "and",
		specific: ["and_conjunction"]
	},
	anticipate: {
		base: "anticipate",
		specific: ["anticipate_expect", "anticipate_future"]
	},
	apotheosis: {
		base: "apotheosis",
		specific: ["apotheosis_ideal", "apotheosis_deification"]
	},
	appeal: {
		base: "appeal",
		specific: ["appeal_attraction", "appeal_request"]
	},
	appearance: {
		base: "appearance",
		specific: ["appearance_arrival", "appearance_look"]
	},
	appendix: {
		base: "appendix",
		specific: ["appendix_anatomy", "appendix_document"]
	},
	annex: {
		base: "annex",
		specific: ["annex_territory", "annex_document", "annex_verb"]
	},
	applaud: {
		base: "applaud",
		specific: ["applaud_verb"]
	},
	application: {
		base: "application",
		specific: ["application_request", "application_software"]
	},
	apply: {
		base: "apply",
		specific: ["apply_job", "apply_use"]
	},
	appointment: {
		base: "appointment",
		specific: ["appointment_job", "appointment_meeting"]
	},
	apprehend: {
		base: "apprehend",
		specific: ["apprehend_understand", "apprehend_arrest"]
	},
	approach: {
		base: "approach",
		specific: ["approach_method", "approach_verb"]
	},
	area: {
		base: "area",
		specific: ["area_field", "area_place", "area_subject", "area_territory"]
	},
	argue: {
		base: "argue",
		specific: ["argue_dispute", "argue_reason"]
	},
	argument: {
		base: "argument",
		specific: ["argument_dispute", "argument_logic", "argument_reason"]
	},
	arm: {
		base: "arm",
		specific: ["arm_body", "arm_weapon"]
	},
	articulate: {
		base: "articulate",
		specific: ["articulate_adj", "articulate_speech"]
	},
	as: {
		base: "as",
		specific: ["as_a_result", "as_conjunction", "as_like", "as_since", "as_soon_as"]
	},
	ask: {
		base: "ask",
		specific: ["ask_for"]
	},
	aspire: {
		base: "aspire",
		specific: ["aspire_goal"]
	},
	assert: {
		base: "assert",
		specific: ["assert_claim", "assert_rights"]
	},
	assessment: {
		base: "assessment",
		specific: ["assessment_eval", "assessment_tax"]
	},
	assign: {
		base: "assign",
		specific: ["assign_role", "assign_task"]
	},
	at: {
	        base: "at",
	        specific: ["at_place", "at_time"]
	},


	band: {
		base: "band",
		specific: ["band_music", "band_strip"]
	},
	bar: {
		base: "bar",
		specific: ["bar_tavern", "bar_rod"]
	},

	bat: {
		base: "bat",
		specific: ["bat_animal", "bat_sports"]
	},

	bill: {
		base: "bill",
		specific: ["bill_invoice", "bill_parliament", "bill_beak", "bill_money"]
	},
	blonde: {
	        base: "blonde",
	        specific: ["blonde_color", "blonde_person"]
	},

	bond: {
		base: "bond",
		specific: ["bond_relation", "bond_finance"]
	},
	boot: {
	        base: "boot",
	        specific: ["boot_car", "boot_shoe"]
	},

	can: {
		base: "can",
		specific: ["can_ability", "can_container"]
	},
	capital: {
		base: "capital",
		specific: ["capital_city", "capital_money"]
	},
	attachment: {
		base: "attachment",
		specific: ["attachment_emotion", "attachment_file"]
	},
	attraction: {
		base: "attraction",
		specific: ["attraction_feature", "attraction_feeling"]
	},
	attribute: {
		base: "attribute",
		specific: ["attribute_quality", "attribute_source"]
	},
	aunt: {
		base: "aunt",
		specific: ["aunt_maternal", "aunt_paternal"]
	},
	authority: {
		base: "authority",
		specific: ["authority_expert", "authority_person", "authority_power"]
	},
	back: {
		base: "back",
		specific: ["back_body", "back_direction"]
	},
	bank: {
		base: "bank",
		specific: ["bank_finance", "bank_river"]
	},
	base: {
		base: "base",
		specific: ["base_foundation", "base_military"]
	},
	battery: {
		base: "battery",
		specific: ["battery_artillery", "battery_electric", "battery_life"]
	},
	bear: {
		base: "bear",
		specific: ["bear_animal", "bear_endure"]
	},
	beat: {
		base: "beat",
		specific: ["beat_win"]
	},
	because: {
		base: "because",
		specific: ["because_conjunction"]
	},
	before: {
		base: "before",
		specific: ["before_position", "before_time"]
	},
	beginning: {
		base: "beginning",
		specific: ["beginning_start"]
	},
	benefit: {
		base: "benefit",
		specific: ["benefit_noun", "benefit_profit"]
	},
	betray: {
		base: "betray",
		specific: ["betray_trust"]
	},
	block: {
		base: "block",
		specific: ["block_object", "block_verb"]
	},
	blue: {
		base: "blue",
		specific: ["blue_dark", "blue_light"]
	},
	board: {
		base: "board",
		specific: ["board_council", "board_wood"]
	},
	boost: {
		base: "boost",
		specific: ["boost_economy", "boost_increase"]
	},
	branch: {
		base: "branch",
		specific: ["branch_office", "branch_tak", "branch_tree"]
	},
	break: {
		base: "break",
		specific: ["break_damage", "break_down_machine", "break_into", "break_pause", "break_up_pair"]
	},
	brother: {
		base: "brother",
		specific: ["brother_older", "brother_younger"]
	},
	budget: {
		base: "budget",
		specific: ["budget_plan"]
	},
	bug: {
		base: "bug",
		specific: ["bug_error", "bug_insect"]
	},
	burn: {
		base: "burn",
		specific: ["burn_fire", "burn_injury"]
	},
	but: {
		base: "but",
		specific: ["but_conjunction"]
	},
	by: {
		base: "by",
		specific: ["by_agent", "by_near", "by_preposition"]
	},
	cabin: {
		base: "cabin",
		specific: ["cabin_plane", "cabin_ship"]
	},
	call: {
		base: "call",
		specific: ["call_back", "call_for", "call_name", "call_off_event", "call_phone", "call_shout"]
	},
	camp: {
		base: "camp",
		specific: ["camp_noun", "camp_verb"]
	},
	carry: {
		base: "carry",
		specific: ["carry_on", "carry_out"]
	},

	cast: {
		base: "cast",
		specific: ["cast_actors", "cast_throw", "cast_medical"]
	},
	catch_up: {
		base: "catch_up",
		specific: ["catch_up_with"]
	},
	cease: {
		base: "cease",
		specific: ["cease_fire", "cease_stop"]
	},

	cell: {
		base: "cell",
		specific: ["cell_biology", "cell_prison", "cell_phone"]
	},
	character: {
		base: "character",
		specific: ["character_fiction", "character_personality"]
	},
	characterise: {
		base: "characterise",
		specific: ["characterise_verb"]
	},
	characteristic: {
		base: "characteristic",
		specific: ["characteristic_noun"]
	},
	charge: {
		base: "charge",
		specific: ["charge_battery", "charge_electric", "charge_fee"]
	},

	chart: {
		base: "chart",
		specific: ["chart_diagram", "chart_music"]
	},
	check: {
		base: "check",
		specific: ["check_in", "check_out"]
	},
	cheer: {
		base: "cheer",
		specific: ["cheer_up"]
	},
	circulate: {
		base: "circulate",
		specific: ["circulate_verb"]
	},
	cite: {
		base: "cite",
		specific: ["cite_verb"]
	},
	claim: {
		base: "claim",
		specific: ["claim_state", "claim_statement"]
	},
	clarify: {
		base: "clarify",
		specific: ["clarify_explain", "clarify_position"]
	},

	clause: {
		base: "clause",
		specific: ["clause_grammar", "clause_legal"]
	},
	clean: {
		base: "clean",
		specific: ["clean_adj", "clean_pure", "clean_up", "clean_wash"]
	},
	clear: {
		base: "clear",
		specific: ["clear_obvious", "clear_transparent"]
	},


	climb: {
		base: "climb",
		specific: ["climb_action", "climb_increase"]
	},

	clip: {
		base: "clip",
		specific: ["clip_video", "clip_fastener"]
	},
	coach: {
		base: "coach",
		specific: ["coach_instructor", "coach_bus"]
	},
	coincide: {
		base: "coincide",
		specific: ["coincide_events", "coincide_happen"]
	},
	collaborate: {
		base: "collaborate",
		specific: ["collaborate_project", "collaborate_work"]
	},
	collapse: {
		base: "collapse",
		specific: ["collapse_noun", "collapse_verb"]
	},
	come: {
		base: "come",
		specific: ["come_across", "come_back", "come_in", "come_on", "come_up_with"]
	},
	command: {
		base: "command",
		specific: ["command_instruction", "command_order"]
	},
	commence: {
		base: "commence",
		specific: ["commence_ceremony", "commence_start"]
	},
	communication: {
		base: "communication",
		specific: ["communication_noun"]
	},
	compensate: {
		base: "compensate",
		specific: ["compensate_loss", "compensate_pay"]
	},
	complement: {
		base: "complement",
		specific: ["complement_style"]
	},
	complete: {
		base: "complete",
		specific: ["complete_adj", "complete_verb"]
	},
	component: {
		base: "component",
		specific: ["component_part"]
	},
	comprehend: {
		base: "comprehend",
		specific: ["comprehend_text", "comprehend_understand"]
	},
	comprehensive: {
		base: "comprehensive",
		specific: ["comprehensive_inclusive", "comprehensive_thorough"]
	},
	conceal: {
		base: "conceal",
		specific: ["conceal_evidence", "conceal_hide"]
	},
	concede: {
		base: "concede",
		specific: ["concede_admit", "concede_defeat"]
	},
	concern: {
		base: "concern",
		specific: ["concern_care", "concern_worry"]
	},
	conclude: {
		base: "conclude",
		specific: ["conclude_meeting"]
	},
	condemn: {
		base: "condemn",
		specific: ["condemn_action", "condemn_criticize"]
	},
	condition: {
		base: "condition",
		specific: ["condition_state", "condition_term"]
	},
	confidence: {
		base: "confidence",
		specific: ["confidence_assurance", "confidence_trust"]
	},
	confine: {
		base: "confine",
		specific: ["confine_area", "confine_limit"]
	},
	conform: {
		base: "conform",
		specific: ["conform_obey", "conform_standards"]
	},
	confront: {
		base: "confront",
		specific: ["confront_face", "confront_issue"]
	},
	conquer: {
		base: "conquer",
		specific: ["conquer_territory", "conquer_win"]
	},
	consent: {
		base: "consent",
		specific: ["consent_form"]
	},
	conserve: {
		base: "conserve",
		specific: ["conserve_energy", "conserve_protect"]
	},
	consolidate: {
		base: "consolidate",
		specific: ["consolidate_power"]
	},
	constitute: {
		base: "constitute",
		specific: ["constitute_form", "constitute_majority"]
	},
	construct: {
		base: "construct",
		specific: ["construct_build", "construct_theory"]
	},
	construction: {
		base: "construction",
		specific: ["construction_noun"]
	},
	consult: {
		base: "consult",
		specific: ["consult_expert", "consult_lawyer"]
	},
	contaminate: {
		base: "contaminate",
		specific: ["contaminate_water"]
	},
	contemplate: {
		base: "contemplate",
		specific: ["contemplate_life", "contemplate_think"]
	},
	contend: {
		base: "contend",
		specific: ["contend_argue", "contend_for"]
	},
	contract: {
		base: "contract",
		specific: ["contract_agreement", "contract_shrink"]
	},
	contribute: {
		base: "contribute",
		specific: ["contribute_donate", "contribute_help"]
	},
	contribution: {
		base: "contribution",
		specific: ["contribution_help"]
	},
	convert: {
		base: "convert",
		specific: ["convert_change"]
	},
	convey: {
		base: "convey",
		specific: ["convey_emotion", "convey_message"]
	},
	cool: {
		base: "cool",
		specific: ["cool_awesome", "cool_temp"]
	},
	cooperate: {
		base: "cooperate",
		specific: ["cooperate_verb"]
	},
	cooperation: {
		base: "cooperation",
		specific: ["cooperation_noun"]
	},
	coordinate: {
		base: "coordinate",
		specific: ["coordinate_action"]
	},
	cope: {
		base: "cope",
		specific: ["cope_with"]
	},

	core: {
		base: "core",
		specific: ["core_center", "core_essential"]
	},
	correct: {
		base: "correct",
		specific: ["correct_adj", "correct_verb"]
	},
	corrupt: {
		base: "corrupt",
		specific: ["corrupt_system"]
	},
	customer: {
		base: "customer",
		specific: ["customer_client", "customer_buyer"]
	},
	fair: {
		base: "fair",
		specific: ["fair_just", "fair_exhibition"]
	},
	may: {
		base: "may",
		specific: ["may_month", "may_modal"]
	},
	type: {
		base: "type",
		specific: ["type_kind", "type_write"]
	},

	courage: {
		base: "courage",
		specific: ["courage_bravery", "courage_manliness"]
	},
	cousin: {
		base: "cousin",
		specific: ["cousin_female", "cousin_male"]
	},
	crash: {
		base: "crash",
		specific: ["crash_accident", "crash_verb"]
	},
	crave: {
		base: "crave",
		specific: ["crave_attention"]
	},
	cream: {
		base: "cream",
		specific: ["cream_cosmetic", "cream_dairy"]
	},
	criticise: {
		base: "criticise",
		specific: ["criticise_verb"]
	},
	cross: {
		base: "cross",
		specific: ["cross_noun", "cross_symbol", "cross_verb"]
	},
	crumble: {
		base: "crumble",
		specific: ["crumble_away"]
	},
	cultivate: {
		base: "cultivate",
		specific: ["cultivate_grow", "cultivate_talent"]
	},
	cure: {
		base: "cure",
		specific: ["cure_medicine", "cure_verb"]
	},
	cut: {
		base: "cut",
		specific: ["cut_down", "cut_off"]
	},
	dance: {
		base: "dance",
		specific: ["dance_noun", "dance_verb"]
	},
	date: {
		base: "date",
		specific: ["date_calendar", "date_romantic"]
	},
	deal: {
		base: "deal",
		specific: ["deal_verb", "deal_with"]
	},
	decision: {
		base: "decision",
		specific: ["decision_noun"]
	},
	decline: {
		base: "decline",
		specific: ["decline_offer", "decline_refuse"]
	},
	decompose: {
		base: "decompose",
		specific: ["decompose_waste"]
	},
	dedicate: {
		base: "dedicate",
		specific: ["dedicate_time"]
	},
	deduce: {
		base: "deduce",
		specific: ["deduce_conclusion", "deduce_logic"]
	},
	definitely: {
		base: "definitely",
		specific: ["definitely_certainly", "definitely_exactly"]
	},
	definition: {
		base: "definition",
		specific: ["definition_meaning"]
	},
	degrade: {
		base: "degrade",
		specific: ["degrade_quality"]
	},

	degree: {
		base: "degree",
		specific: ["degree_temperature", "degree_academic"]
	},
	deliberate: {
		base: "deliberate",
		specific: ["deliberate_issue"]
	},
	demonstrate: {
		base: "demonstrate",
		specific: ["demonstrate_show", "demonstrate_skill"]
	},
	demonstration: {
		base: "demonstration",
		specific: ["demonstration_noun"]
	},
	department: {
		base: "department",
		specific: ["department_store"]
	},
	depict: {
		base: "depict",
		specific: ["depict_character", "depict_describe"]
	},
	deplore: {
		base: "deplore",
		specific: ["deplore_action"]
	},
	deprive: {
		base: "deprive",
		specific: ["deprive_rights"]
	},
	derive: {
		base: "derive",
		specific: ["derive_from", "derive_pleasure"]
	},
	design: {
		base: "design",
		specific: ["design_plan", "design_style", "design_verb"]
	},
	designate: {
		base: "designate",
		specific: ["designate_mark", "designate_official"]
	},
	detach: {
		base: "detach",
		specific: ["detach_part"]
	},
	detail: {
		base: "detail",
		specific: ["detail_info"]
	},
	detect: {
		base: "detect",
		specific: ["detect_error", "detect_find"]
	},
	deter: {
		base: "deter",
		specific: ["deter_crime", "deter_prevent"]
	},
	devastate: {
		base: "devastate",
		specific: ["devastate_area"]
	},
	devise: {
		base: "devise",
		specific: ["devise_method", "devise_plan"]
	},
	diagnose: {
		base: "diagnose",
		specific: ["diagnose_illness", "diagnose_patient"]
	},
	different: {
		base: "different",
		specific: ["different_other", "different_various"]
	},
	differentiate: {
		base: "differentiate",
		specific: ["differentiate_between", "differentiate_distinguish"]
	},
	diminish: {
		base: "diminish",
		specific: ["diminish_decrease", "diminish_influence"]
	},
	direct: {
		base: "direct",
		specific: ["direct_adj"]
	},
	disaster: {
		base: "disaster",
		specific: ["disaster_event"]
	},
	disclose: {
		base: "disclose",
		specific: ["disclose_info", "disclose_secret"]
	},
	discourage: {
		base: "discourage",
		specific: ["discourage_prevent"]
	},
	discredit: {
		base: "discredit",
		specific: ["discredit_theory"]
	},
	disgust: {
		base: "disgust",
		specific: ["disgust_feeling"]
	},

	dish: {
		base: "dish",
		specific: ["dish_plate", "dish_food"]
	},
	disprove: {
		base: "disprove",
		specific: ["disprove_theory"]
	},
	dispute: {
		base: "dispute",
		specific: ["dispute_noun"]
	},
	distinguish: {
		base: "distinguish",
		specific: ["distinguish_colors", "distinguish_see"]
	},
	distort: {
		base: "distort",
		specific: ["distort_image", "distort_truth"]
	},
	divert: {
		base: "divert",
		specific: ["divert_attention", "divert_traffic"]
	},
	divulge: {
		base: "divulge",
		specific: ["divulge_secret"]
	},
	dominate: {
		base: "dominate",
		specific: ["dominate_control", "dominate_market"]
	},
	download: {
		base: "download",
		specific: ["download_file"]
	},
	draft: {
		base: "draft",
		specific: ["draft_outline", "draft_sketch", "draft_wind"]
	},
	drama: {
		base: "drama",
		specific: ["drama_art"]
	},
	dramatise: {
		base: "dramatise",
		specific: ["dramatise_verb"]
	},
	dream: {
		base: "dream",
		specific: ["dream_goal", "dream_sleep"]
	},
	dress: {
		base: "dress",
		specific: ["dress_up"]
	},
	drift: {
		base: "drift",
		specific: ["drift_away"]
	},
	drug: {
		base: "drug",
		specific: ["drug_medicine", "drug_narcotic"]
	},
	due: {
		base: "due",
		specific: ["due_expected", "due_to"]
	},
	drive: {
		base: "drive",
		specific: ["drive_verb", "drive_it"]
	},
	duplicate: {
		base: "duplicate",
		specific: ["duplicate_copy", "duplicate_key"]
	},
	dwindle: {
		base: "dwindle",
		specific: ["dwindle_away"]
	},
	earth: {
		base: "earth",
		specific: ["earth_ground", "earth_planet", "earth_yer"]
	},
	eat: {
		base: "eat",
		specific: ["eat_out"]
	},
	ecology: {
		base: "ecology",
		specific: ["ecology_noun"]
	},
	economy: {
		base: "economy",
		specific: ["economy_noun", "economy_system"]
	},
	education: {
		base: "education",
		specific: ["education_system"]
	},
	effect: {
		base: "effect",
		specific: ["effect_influence", "effect_result"]
	},
	efficiency: {
		base: "efficiency",
		specific: ["efficiency_noun"]
	},
	eject: {
		base: "eject",
		specific: ["eject_verb"]
	},
	elaborate: {
		base: "elaborate",
		specific: ["elaborate_adj", "elaborate_detail", "elaborate_on"]
	},
	election: {
		base: "election",
		specific: ["election_noun"]
	},
	element: {
		base: "element",
		specific: ["element_noun"]
	},
	eliminate: {
		base: "eliminate",
		specific: ["eliminate_remove", "eliminate_waste"]
	},
	emanate: {
		base: "emanate",
		specific: ["emanate_from"]
	},
	embark: {
		base: "embark",
		specific: ["embark_on"]
	},
	embrace: {
		base: "embrace",
		specific: ["embrace_change"]
	},
	emerge: {
		base: "emerge",
		specific: ["emerge_appear", "emerge_stronger"]
	},
	emit: {
		base: "emit",
		specific: ["emit_light"]
	},

	employment: {
		base: "employment",
		specific: ["employment_job", "employment_hiring"]
	},
	enact: {
		base: "enact",
		specific: ["enact_law"]
	},
	encounter: {
		base: "encounter",
		specific: ["encounter_difficulty", "encounter_meet"]
	},
	end: {
		base: "end",
		specific: ["end_up"]
	},
	endorse: {
		base: "endorse",
		specific: ["endorse_candidate", "endorse_support"]
	},

	engaged: {
		base: "engaged",
		specific: ["engaged_busy", "engaged_married"]
	},
	engagement: {
		base: "engagement",
		specific: ["engagement_betrothal", "engagement_involvement"]
	},
	enhance: {
		base: "enhance",
		specific: ["enhance_improve", "enhance_quality"]
	},
	enhancement: {
		base: "enhancement",
		specific: ["enhancement_augmentation", "enhancement_improvement"]
	},
	entail: {
		base: "entail",
		specific: ["entail_cost", "entail_involve"]
	},

	entry: {
		base: "entry",
		specific: ["entry_entrance", "entry_record"]
	},
	environment: {
		base: "environment",
		specific: ["environment_nature", "environment_noun"]
	},
	envision: {
		base: "envision",
		specific: ["envision_future", "envision_imagine"]
	},
	equation: {
		base: "equation",
		specific: ["equation_noun"]
	},
	erode: {
		base: "erode",
		specific: ["erode_confidence", "erode_damage"]
	},
	establishment: {
		base: "establishment",
		specific: ["establishment_founding", "establishment_institution"]
	},
	evaluate: {
		base: "evaluate",
		specific: ["evaluate_assess", "evaluate_impact"]
	},
	evaporate: {
		base: "evaporate",
		specific: ["evaporate_water"]
	},
	even: {
		base: "even",
		specific: ["even_if", "even_though"]
	},
	evolve_over: {
		base: "evolve_over",
		specific: ["evolve_over_time"]
	},
	exaggerate: {
		base: "exaggerate",
		specific: ["exaggerate_overstate", "exaggerate_truth"]
	},
	exceed: {
		base: "exceed",
		specific: ["exceed_expectations", "exceed_surpass"]
	},
	exclude_keep: {
		base: "exclude_keep",
		specific: ["exclude_keep_out"]
	},
	execute: {
		base: "execute",
		specific: ["execute_order", "execute_plan"]
	},
	exhibit: {
		base: "exhibit",
		specific: ["exhibit_art", "exhibit_show"]
	},
	expel_force: {
		base: "expel_force",
		specific: ["expel_force_out"]
	},
	experience: {
		base: "experience",
		specific: ["experience_noun", "experience_verb"]
	},
	exploit: {
		base: "exploit",
		specific: ["exploit_use"]
	},

	extent: {
		base: "extent",
		specific: ["extent_size", "extent_degree"]
	},
	facilitate: {
		base: "facilitate",
		specific: ["facilitate_help"]
	},

	facility: {
		base: "facility",
		specific: ["facility_building", "facility_amenity"]
	},
	failure: {
		base: "failure",
		specific: ["failure_defeat", "failure_lack"]
	},

	fairly: {
		base: "fairly",
		specific: ["fairly_quite", "fairly_honestly"]
	},
	fall: {
		base: "fall",
		specific: ["fall_autumn", "fall_drop", "fall_out"]
	},

	fan: {
		base: "fan",
		specific: ["fan_admirer", "fan_device"]
	},
	fat: {
		base: "fat",
		specific: ["fat_obese", "fat_oil"]
	},
	fault: {
		base: "fault",
		specific: ["fault_blame", "fault_defect"]
	},
	fight: {
		base: "fight",
		specific: ["fight_action", "fight_event"]
	},

	firm: {
		base: "firm",
		specific: ["firm_company", "firm_hard"]
	},
	fit: {
		base: "fit",
		specific: ["fit_healthy", "fit_suit"]
	},
	figure: {
		base: "figure",
		specific: ["figure_out"]
	},
	film: {
		base: "film",
		specific: ["film_noun", "film_verb"]
	},
	find: {
		base: "find",
		specific: ["find_out"]
	},
	fine: {
		base: "fine",
		specific: ["fine_good", "fine_penalty"]
	},
	flat: {
		base: "flat",
		specific: ["flat_adj", "flat_apartment", "flat_surface"]
	},

	flight: {
		base: "flight",
		specific: ["flight_plane", "flight_stairs"]
	},
	float: {
		base: "float",
		specific: ["float_verb"]
	},
	floor: {
		base: "floor",
		specific: ["floor_ground", "floor_level"]
	},
	fluctuate: {
		base: "fluctuate",
		specific: ["fluctuate_change"]
	},
	fly: {
		base: "fly",
		specific: ["fly_action", "fly_insect"]
	},

	formerly: {
		base: "formerly",
		specific: ["formerly_past", "formerly_previously"]
	},

	foundation: {
		base: "foundation",
		specific: ["foundation_base", "foundation_organization"]
	},

	fraction: {
		base: "fraction",
		specific: ["fraction_math", "fraction_part"]
	},

	framework: {
		base: "framework",
		specific: ["framework_structure", "framework_software"]
	},
	free: {
		base: "free",
		specific: ["free_cost", "free_gratis", "free_liberty"]
	},
	from: {
		base: "from",
		specific: ["from_origin", "from_time"]
	},
	frustrate: {
		base: "frustrate",
		specific: ["frustrate_prevent"]
	},
	fundamental: {
		base: "fundamental",
		specific: ["fundamental_basic", "fundamental_essential"]
	},
	garden: {
		base: "garden",
		specific: ["garden_orchard", "garden_yard"]
	},
	gas: {
		base: "gas",
		specific: ["gas_fuel", "gas_station", "gas_substance"]
	},

	gender: {
		base: "gender",
		specific: ["gender_sex", "gender_social"]
	},
	get: {
		base: "get",
		specific: ["get_along_with", "get_away", "get_back", "get_by", "get_off_transport", "get_on_transport", "get_over_illness", "get_rid_of", "get_up"]
	},

	gig: {
		base: "gig",
		specific: ["gig_concert", "gig_job"]
	},
	give: {
		base: "give",
		specific: ["give_away", "give_back", "give_in_surrender", "give_up_habit", "give_up_quit", "give_up_surrender"]
	},
	glass: {
		base: "glass",
		specific: ["glass_cup", "glass_material"]
	},
	go: {
		base: "go",
		specific: ["go_foot", "go_on", "go_out", "go_vehicle"]
	},
	grow: {
		base: "grow",
		specific: ["grow_up", "grow_up_mature", "grow_up_physical"]
	},
	growth: {
		base: "growth",
		specific: ["growth_development", "growth_physical"]
	},
	guard: {
		base: "guard",
		specific: ["guard_person"]
	},

	hand: {
		base: "hand",
		specific: ["hand_body", "hand_verb"]
	},
	hang: {
		base: "hang",
		specific: ["hang_out", "hang_verb"]
	},
	hard: {
		base: "hard",
		specific: ["hard_difficult", "hard_solid", "hard_tough"]
	},
	hardly: {
		base: "hardly",
		specific: ["hardly_barely", "hardly_unlikely"]
	},
	he: {
		base: "he",
		specific: ["he_pronoun"]
	},
	her: {
		base: "her",
		specific: ["her_possessive", "her_pronoun"]
	},

	highly: {
		base: "highly",
		specific: ["highly_degree", "highly_position"]
	},
	him: {
		base: "him",
		specific: ["him_pronoun"]
	},
	hinder: {
		base: "hinder",
		specific: ["hinder_prevent"]
	},
	his: {
		base: "his",
		specific: ["his_possessive"]
	},
	hold: {
		base: "hold",
		specific: ["hold_on"]
	},
	holiday: {
		base: "holiday",
		specific: ["holiday_celebration", "holiday_vacation"]
	},

	host: {
		base: "host",
		specific: ["host_entertainer", "host_biology", "host_server"]
	},
	how: {
		base: "how",
		specific: ["how_come", "how_far", "how_long", "how_many", "how_much", "how_often", "how_old"]
	},

	however: {
		base: "however",
		specific: ["however_contrast", "however_degree"]
	},
	hurt: {
		base: "hurt",
		specific: ["hurt_injury", "hurt_pain"]
	},
	i: {
		base: "i",
		specific: ["i_know", "i_pronoun", "i_see", "i_think"]
	},
	if: {
		base: "if",
		specific: ["if_conjunction"]
	},
	illustrate: {
		base: "illustrate",
		specific: ["illustrate_explain"]
	},

	image: {
		base: "image",
		specific: ["image_picture", "image_reputation"]
	},
	impose: {
		base: "impose",
		specific: ["impose_tax"]
	},
	in: {
		base: "in",
		specific: ["in_case", "in_front_of", "in_order_to", "in_spite_of"]
	},
	income: {
		base: "income",
		specific: ["income_tax"]
	},
	initiate: {
		base: "initiate",
		specific: ["initiate_start"]
	},
	interpret: {
		base: "interpret",
		specific: ["interpret_explain"]
	},
	interview: {
		base: "interview",
		specific: ["interview_job"]
	},
	iron: {
		base: "iron",
		specific: ["iron_noun", "iron_verb"]
	},

	issue: {
		base: "issue",
		specific: ["issue_problem", "issue_edition"]
	},
	it: {
		base: "it",
		specific: ["it_pronoun"]
	},
	its: {
		base: "its",
		specific: ["its_possessive"]
	},
	jam: {
		base: "jam",
		specific: ["jam_fruit", "jam_traffic"]
	},
	keep: {
		base: "keep",
		specific: ["keep_hold", "keep_on", "keep_store", "keep_up"]
	},

	key: {
		base: "key",
		specific: ["key_lock", "key_piano", "key_essential"]
	},
	kind: {
		base: "kind",
		specific: ["kind_nice", "kind_type"]
	},
	knock: {
		base: "knock",
		specific: ["knock_verb"]
	},
	know: {
		base: "know",
		specific: ["know_info", "know_person"]
	},
	lady: {
		base: "lady",
		specific: ["lady_noble", "lady_woman"]
	},
	leader: {
		base: "leader",
		specific: ["leader_person"]
	},
	last: {
		base: "last",
		specific: ["last_final", "last_previous"]
	},
	leave: {
		base: "leave",
		specific: ["leave_behind", "leave_depart", "leave_object", "leave_place"]
	},
	left: {
		base: "left",
		specific: ["left_direction", "left_remaining"]
	},
	legislate: {
		base: "legislate",
		specific: ["legislate_law"]
	},
	levy: {
		base: "levy",
		specific: ["levy_tax"]
	},
	license: {
		base: "license",
		specific: ["license_document"]
	},
	lie: {
		base: "lie",
		specific: ["lie_false", "lie_position"]
	},
	lift: {
		base: "lift",
		specific: ["lift_action", "lift_elevator"]
	},
	light: {
		base: "light",
		specific: ["light_brightness", "light_color", "light_weight"]
	},
	live: {
		base: "live",
		specific: ["live_exist", "live_reside"]
	},
	look: {
		base: "look",
		specific: ["look_after", "look_at", "look_for", "look_forward_to", "look_out", "look_up_word"]
	},
	machine: {
		base: "machine",
		specific: ["machine_car", "machine_mechanism"]
	},
	mad: {
		base: "mad",
		specific: ["mad_angry", "mad_insane"]
	},
	major: {
		base: "major",
		specific: ["major_main", "major_music"]
	},
	mark: {
		base: "mark",
		specific: ["mark_grade", "mark_sign"]
	},
	match: {
		base: "match",
		specific: ["match_fire", "match_game", "match_suit"]
	},
	matter: {
		base: "matter",
		specific: ["matter_issue", "matter_substance"]
	},
	me: {
		base: "me",
		specific: ["me_pronoun"]
	},
	measure: {
		base: "measure",
		specific: ["measure_noun", "measure_size"]
	},
	medicine: {
		base: "medicine",
		specific: ["medicine_drug", "medicine_field", "medicine_substance"]
	},

	mine: {
		base: "mine",
		specific: ["mine_possessive", "mine_excavation"]
	},

	minor: {
		base: "minor",
		specific: ["minor_small", "minor_underage"]
	},
	miss: {
		base: "miss",
		specific: ["miss_action", "miss_sad"]
	},
	mix: {
		base: "mix",
		specific: ["mix_noun", "mix_verb"]
	},
	monitor: {
		base: "monitor",
		specific: ["monitor_screen", "monitor_verb"]
	},


	mount: {
		base: "mount",
		specific: ["mount_mountain", "mount_attach"]
	},
	mud: {
		base: "mud",
		specific: ["mud_wet_earth", "mud_slander"]
	},
	murder: {
		base: "murder",
		specific: ["murder_noun", "murder_verb"]
	},
	my: {
		base: "my",
		specific: ["my_possessive"]
	},

	nail: {
		base: "nail",
		specific: ["nail_finger", "nail_metal"]
	},

	native: {
		base: "native",
		specific: ["native_local", "native_born"]
	},

	neither: {
		base: "neither",
		specific: ["neither_pronoun", "neither_conjunction"]
	},
	nicely: {
		base: "nicely",
		specific: ["nicely_kindly", "nicely_well"]
	},
	number: {
		base: "number",
		specific: ["number_digit", "number_item"]
	},
	object: {
		base: "object",
		specific: ["object_noun", "object_verb"]
	},



	objective: {
		base: "objective",
		specific: ["objective_goal", "objective_neutral"]
	},
	occasionally: {
		base: "occasionally",
		specific: ["occasionally_sometimes", "occasionally_rarely"]
	},

	occupation: {
		base: "occupation",
		specific: ["occupation_job", "occupation_military"]
	},
	odd: {
		base: "odd",
		specific: ["odd_strange", "odd_number"]
	},
	offend: {
		base: "offend",
		specific: ["offend_insult"]
	},

	offensive: {
		base: "offensive",
		specific: ["offensive_insulting", "offensive_attack"]
	},
	offer: {
		base: "offer",
		specific: ["offer_noun", "offer_verb"]
	},
	oil: {
		base: "oil",
		specific: ["oil_food", "oil_fuel"]
	},


	opening: {
		base: "opening",
		specific: ["opening_gap", "opening_ceremony"]
	},
	opinion: {
		base: "opinion",
		specific: ["opinion_belief", "opinion_view"]
	},

	option: {
		base: "option",
		specific: ["option_choice", "option_feature"]
	},
	or: {
		base: "or",
		specific: ["or_conjunction"]
	},
	orange: {
		base: "orange",
		specific: ["orange_color", "orange_fruit"]
	},
	order: {
		base: "order",
		specific: ["order_command", "order_sequence"]
	},
	originate: {
		base: "originate",
		specific: ["originate_start"]
	},
	our: {
		base: "our",
		specific: ["our_possessive"]
	},
	paint: {
		base: "paint",
		specific: ["paint_noun", "paint_verb"]
	},
	parent: {
		base: "parent",
		specific: ["parent_father", "parent_mother"]
	},

	particularly: {
		base: "particularly",
		specific: ["particularly_especially", "particularly_specifically"]
	},
	party: {
		base: "party",
		specific: ["party_political", "party_social"]
	},
	patient: {
		base: "patient",
		specific: ["patient_adjective", "patient_enduring", "patient_medical"]
	},
	pattern: {
		base: "pattern",
		specific: ["pattern_design", "pattern_template"]
	},
	perceive: {
		base: "perceive",
		specific: ["perceive_see"]
	},
	performance: {
		base: "performance",
		specific: ["performance_efficiency", "performance_show"]
	},
	permanent: {
		base: "permanent",
		specific: ["permanent_job"]
	},
	pick: {
		base: "pick",
		specific: ["pick_choose", "pick_up_object"]
	},
	picture: {
		base: "picture",
		specific: ["picture_painting", "picture_photo"]
	},
	pie: {
		base: "pie",
		specific: ["pie_baked", "pie_pie"]
	},

	pitch: {
		base: "pitch",
		specific: ["pitch_sound", "pitch_field", "pitch_throw"]
	},

	plain: {
		base: "plain",
		specific: ["plain_simple", "plain_prairie"]
	},
	plant: {
		base: "plant",
		specific: ["plant_botany", "plant_factory"]
	},
	point: {
		base: "point",
		specific: ["point_dot", "point_essence", "point_out"]
	},
	post: {
		base: "post",
		specific: ["post_office", "post_verb"]
	},
	power: {
		base: "power",
		specific: ["power_authority", "power_strength"]
	},
	present: {
		base: "present",
		specific: ["present_current", "present_gift", "present_here", "present_time"]
	},
	prevail: {
		base: "prevail",
		specific: ["prevail_win"]
	},
	prioritise: {
		base: "prioritise",
		specific: ["prioritise_task"]
	},
	promotion: {
		base: "promotion",
		specific: ["promotion_job"]
	},

	proper: {
		base: "proper",
		specific: ["proper_correct", "proper_social"]
	},
	prosecute: {
		base: "prosecute",
		specific: ["prosecute_law"]
	},
	protest: {
		base: "protest",
		specific: ["protest_event"]
	},
	provided: {
		base: "provided",
		specific: ["provided_that"]
	},
	psychological: {
		base: "psychological",
		specific: ["psychological_state"]
	},
	public: {
		base: "public",
		specific: ["public_transport"]
	},

	pupil: {
		base: "pupil",
		specific: ["pupil_student", "pupil_eye"]
	},
	pure: {
		base: "pure",
		specific: ["pure_water"]
	},
	pursue: {
		base: "pursue",
		specific: ["pursue_goal"]
	},
	put: {
		base: "put",
		specific: ["put_away", "put_off_event", "put_on_clothes", "put_out", "put_up_with"]
	},
	qualification: {
		base: "qualification",
		specific: ["qualification_degree"]
	},
	qualify: {
		base: "qualify",
		specific: ["qualify_meet", "qualify_gain"]
	},
	race: {
		base: "race",
		specific: ["race_competition", "race_ethnicity"]
	},
	rate: {
		base: "rate",
		specific: ["rate_speed", "rate_value"]
	},
	realise: {
		base: "realise",
		specific: ["realise_verb"]
	},
	recognise: {
		base: "recognise",
		specific: ["recognise_verb"]
	},
	record: {
		base: "record",
		specific: ["record_achievement", "record_data", "record_verb"]
	},
	regular: {
		base: "regular",
		specific: ["regular_meeting"]
	},
	regulate: {
		base: "regulate",
		specific: ["regulate_verb"]
	},
	relevant: {
		base: "relevant",
		specific: ["relevant_info"]
	},
	renounce_give: {
		base: "renounce_give",
		specific: ["renounce_give_up"]
	},
	report: {
		base: "report",
		specific: ["report_noun", "report_verb"]
	},
	reproduce: {
		base: "reproduce",
		specific: ["reproduce_copy"]
	},

	resolution: {
		base: "resolution",
		specific: ["resolution_decision", "resolution_screen"]
	},
	respect: {
		base: "respect",
		specific: ["respect_noun", "respect_verb"]
	},
	responsible: {
		base: "responsible",
		specific: ["responsible_person"]
	},
	restrain: {
		base: "restrain",
		specific: ["restrain_limit"]
	},
	restrict: {
		base: "restrict",
		specific: ["restrict_limit"]
	},
	rid: {
		base: "rid",
		specific: ["rid_verb"]
	},
	right: {
		base: "right",
		specific: ["right_correct", "right_direction"]
	},
	ring: {
		base: "ring",
		specific: ["ring_jewel", "ring_sound"]
	},
	rock: {
		base: "rock",
		specific: ["rock_music", "rock_stone"]
	},
	rough: {
		base: "rough",
		specific: ["rough_surface"]
	},
	safety: {
		base: "safety",
		specific: ["safety_state"]
	},
	sausage: {
		base: "sausage",
		specific: ["sausage_small", "sausage_wurst"]
	},
	save: {
		base: "save",
		specific: ["save_keep", "save_rescue", "save_store"]
	},

	scale: {
		base: "scale",
		specific: ["scale_size", "scale_weighing"]
	},
	scan: {
		base: "scan",
		specific: ["scan_digital", "scan_medical"]
	},
	scream: {
		base: "scream",
		specific: ["scream_noun", "scream_verb"]
	},
	search: {
		base: "search",
		specific: ["search_noun", "search_verb"]
	},
	second: {
		base: "second",
		specific: ["second_ord", "second_ordinal", "second_time"]
	},

	secure: {
		base: "secure",
		specific: ["secure_safe", "secure_protect"]
	},
	sense: {
		base: "sense",
		specific: ["sense_feel", "sense_feeling", "sense_meaning"]
	},
	serve: {
		base: "serve",
		specific: ["serve_duty", "serve_general", "serve_service"]
	},
	service: {
		base: "service",
		specific: ["service_business", "service_duty"]
	},
	set: {
		base: "set",
		specific: ["set_collection", "set_off_journey", "set_up", "set_verb"]
	},
	settle: {
		base: "settle",
		specific: ["settle_dispute"]
	},
	she: {
		base: "she",
		specific: ["she_pronoun"]
	},
	shift: {
		base: "shift",
		specific: ["shift_move", "shift_work"]
	},
	sight: {
		base: "sight",
		specific: ["sight_view", "sight_vision"]
	},
	sign: {
		base: "sign",
		specific: ["sign_symbol", "sign_verb"]
	},
	sister: {
		base: "sister",
		specific: ["sister_older", "sister_younger"]
	},
	site: {
		base: "site",
		specific: ["site_location", "site_web"]
	},
	smell: {
		base: "smell",
		specific: ["smell_action", "smell_sense"]
	},
	smoke: {
		base: "smoke",
		specific: ["smoke_action", "smoke_gas"]
	},
	smooth: {
		base: "smooth",
		specific: ["smooth_surface"]
	},
	so: {
		base: "so",
		specific: ["so_adv", "so_conjunction", "so_degree", "so_that"]
	},
	solid: {
		base: "solid",
		specific: ["solid_material"]
	},
	sorry: {
		base: "sorry",
		specific: ["sorry_adj"]
	},
	sort: {
		base: "sort",
		specific: ["sort_kind", "sort_out", "sort_type"]
	},
	space: {
		base: "space",
		specific: ["space_area", "space_cosmos"]
	},
	speculate: {
		base: "speculate",
		specific: ["speculate_think"]
	},
	spell: {
		base: "spell",
		specific: ["spell_noun", "spell_verb"]
	},
	spiritual: {
		base: "spiritual",
		specific: ["spiritual_life"]
	},
	sponsor: {
		base: "sponsor",
		specific: ["sponsor_help"]
	},

	spring: {
		base: "spring",
		specific: ["spring_season", "spring_coil"]
	},
	square: {
		base: "square",
		specific: ["square_place", "square_shape"]
	},

	stable: {
		base: "stable",
		specific: ["stable_steady", "stable_animal"]
	},
	stage: {
		base: "stage",
		specific: ["stage_phase", "stage_theater"]
	},

	stall: {
		base: "stall",
		specific: ["stall_shop", "stall_engine"]
	},
	stand: {
		base: "stand",
		specific: ["stand_up"]
	},
	start: {
		base: "start",
		specific: ["start_noun", "start_verb"]
	},
	state: {
		base: "state",
		specific: ["state_condition", "state_country", "state_declare"]
	},

	statement: {
		base: "statement",
		specific: ["statement_declaration", "statement_financial"]
	},
	station: {
		base: "station",
		specific: ["station_generic", "station_bahnhof", "station_stop", "station_transport"]
	},

	still: {
		base: "still",
		specific: ["still_continuing", "still_motionless"]
	},
	stock: {
		base: "stock",
		specific: ["stock_inventory", "stock_share"]
	},
	stop: {
		base: "stop",
		specific: ["stop_location", "stop_verb"]
	},
	store: {
		base: "store",
		specific: ["store_shop", "store_verb"]
	},


	strike: {
		base: "strike",
		specific: ["strike_hit", "strike_protest"]
	},
	string: {
		base: "string",
		specific: ["string_thread", "string_computer"]
	},

	stroke: {
		base: "stroke",
		specific: ["stroke_medical", "stroke_hit"]
	},
	stuff: {
		base: "stuff",
		specific: ["stuff_material", "stuff_things"]
	},
	subject: {
		base: "subject",
		specific: ["subject_school", "subject_topic"]
	},
	submit: {
		base: "submit",
		specific: ["submit_document"]
	},
	subscribe: {
		base: "subscribe",
		specific: ["subscribe_sign"]
	},

	suit: {
		base: "suit",
		specific: ["suit_clothing", "suit_lawsuit", "suit_verb"]
	},
	supervise: {
		base: "supervise",
		specific: ["supervise_manage"]
	},
	support: {
		base: "support",
		specific: ["support_help"]
	},
	surrender_give: {
		base: "surrender_give",
		specific: ["surrender_give_up"]
	},
	surround: {
		base: "surround",
		specific: ["surround_area"]
	},


	table: {
		base: "table",
		specific: ["table_furniture", "table_data"]
	},
	tablet: {
		base: "tablet",
		specific: ["tablet_device", "tablet_pill"]
	},
	take: {
		base: "take",
		specific: ["take_after_relative", "take_off_clothes", "take_up_hobby"]
	},
	talk: {
		base: "talk",
		specific: ["talk_noun", "talk_verb"]
	},

	tank: {
		base: "tank",
		specific: ["tank_military", "tank_container"]
	},

	tap: {
		base: "tap",
		specific: ["tap_faucet", "tap_touch"]
	},
	target: {
		base: "target",
		specific: ["target_noun", "target_verb"]
	},
	technical: {
		base: "technical",
		specific: ["technical_support"]
	},
	temporary: {
		base: "temporary",
		specific: ["temporary_job"]
	},
	testify: {
		base: "testify",
		specific: ["testify_court"]
	},
	thank: {
		base: "thank",
		specific: ["thank_verb", "thank_you"]
	},
	that: {
		base: "that",
		specific: ["that_conjunction", "that_demonstrative", "that_pronoun"]
	},
	their: {
		base: "their",
		specific: ["their_possessive"]
	},
	them: {
		base: "them",
		specific: ["them_pronoun"]
	},
	then: {
		base: "then",
		specific: ["then_sequence", "then_time"]
	},

	therefore: {
		base: "therefore",
		specific: ["therefore_consequence", "therefore_reason"]
	},
	throughout: {
		base: "throughout",
		specific: ["throughout_space", "throughout_time"]
	},
	these: {
		base: "these",
		specific: ["these_pronoun"]
	},
	they: {
		base: "they",
		specific: ["they_pronoun"]
	},
	this: {
		base: "this",
		specific: ["this_pronoun"]
	},
	those: {
		base: "those",
		specific: ["those_pronoun"]
	},
	ticket: {
		base: "ticket",
		specific: ["ticket_office"]
	},
	time: {
		base: "time",
		specific: ["time_abstract", "time_clock"]
	},


	timing: {
		base: "timing",
		specific: ["timing_pace", "timing_schedule"]
	},
	tin: {
		base: "tin",
		specific: ["tin_metal", "tin_container"]
	},

	tissue: {
		base: "tissue",
		specific: ["tissue_paper", "tissue_biology"]
	},
	to: {
		base: "to",
		specific: ["to_be", "to_do", "to_have", "to_infinitive", "to_preposition"]
	},
	too: {
		base: "too",
		specific: ["too_also", "too_excessive", "too_much"]
	},
	touch: {
		base: "touch",
		specific: ["touch_noun", "touch_verb"]
	},

	track: {
		base: "track",
		specific: ["track_path", "track_music"]
	},
	transform: {
		base: "transform",
		specific: ["transform_change"]
	},
	transport: {
		base: "transport",
		specific: ["transport_noun", "transport_verb"]
	},
	treat: {
		base: "treat",
		specific: ["treat_behave", "treat_medical"]
	},
	trial: {
		base: "trial",
		specific: ["trial_court", "trial_test"]
	},

	trick: {
		base: "trick",
		specific: ["trick_deception", "trick_skill"]
	},
	trust: {
		base: "trust",
		specific: ["trust_noun", "trust_verb"]
	},
	tube: {
		base: "tube",
		specific: ["tube_pipe", "tube_subway"]
	},
	turn: {
		base: "turn",
		specific: ["turn_direction", "turn_down_volume", "turn_into", "turn_off_device", "turn_on_device", "turn_order", "turn_up"]
	},
	ugly: {
		base: "ugly",
		specific: ["ugly_adj"]
	},
	uncle: {
		base: "uncle",
		specific: ["uncle_maternal", "uncle_paternal"]
	},
	undertake: {
		base: "undertake",
		specific: ["undertake_task"]
	},
	unify: {
		base: "unify",
		specific: ["unify_verb"]
	},
	unique: {
		base: "unique",
		specific: ["unique_style"]
	},
	unit: {
		base: "unit",
		specific: ["unit_component", "unit_measure"]
	},
	universe: {
		base: "universe",
		specific: ["universe_cosmos"]
	},
	unknown: {
		base: "unknown",
		specific: ["unknown_person"]
	},
	unlikely: {
		base: "unlikely",
		specific: ["unlikely_event"]
	},
	update: {
		base: "update",
		specific: ["update_info"]
	},
	uphold: {
		base: "uphold",
		specific: ["uphold_support"]
	},
	upset: {
		base: "upset",
		specific: ["upset_adj", "upset_verb"]
	},
	urgent: {
		base: "urgent",
		specific: ["urgent_matter"]
	},
	us: {
		base: "us",
		specific: ["us_accusative", "us_dative", "us_pronoun"]
	},
	utilise: {
		base: "utilise",
		specific: ["utilise_use"]
	},
	version: {
		base: "version",
		specific: ["version_software"]
	},
	view: {
		base: "view",
		specific: ["view_opinion", "view_scenery", "view_verb"]
	},
	violate: {
		base: "violate",
		specific: ["violate_law"]
	},
	visible: {
		base: "visible",
		specific: ["visible_sign"]
	},
	visualise: {
		base: "visualise",
		specific: ["visualise_imagine"]
	},
	volume: {
		base: "volume",
		specific: ["volume_sound"]
	},
	walk: {
		base: "walk",
		specific: ["walk_step", "walk_stroll"]
	},
	watch: {
		base: "watch",
		specific: ["watch_clock", "watch_verb"]
	},
	wave: {
		base: "wave",
		specific: ["wave_noun", "wave_verb"]
	},
	way: {
		base: "way",
		specific: ["way_method", "way_path"]
	},
	we: {
		base: "we",
		specific: ["we_pronoun"]
	},
	well: {
		base: "well",
		specific: ["well_adverb", "well_water"]
	},
	what: {
		base: "what",
		specific: ["what_about", "what_color", "what_for", "what_kind", "what_size", "what_time"]
	},
	where: {
		base: "where",
		specific: ["where_from", "where_to"]
	},
	will: {
		base: "will",
		specific: ["will_future", "will_noun"]
	},
	willing_to: {
		base: "willing_to",
		specific: ["willing_to_help"]
	},
	wish: {
		base: "wish",
		specific: ["wish_noun", "wish_verb"]
	},
	without: {
		base: "without",
		specific: ["without_preposition", "without_preposition_alt"]
	},
	witness: {
		base: "witness",
		specific: ["witness_person"]
	},
	wood: {
		base: "wood",
		specific: ["wood_bos", "wood_forest", "wood_holz", "wood_material"]
	},
	work: {
		base: "work",
		specific: ["work_out"]
	},

	worth: {
		base: "worth",
		specific: ["worth_value", "worth_deserving"]
	},
	would: {
		base: "would",
		specific: ["would_auxiliary", "would_auxiliary_alt"]
	},
	you: {
		base: "you",
		specific: ["you_formal", "you_informal", "you_plural", "you_pronoun", "you_singular"]
	},
	your: {
		base: "your",
		specific: ["your_plural", "your_possessive", "your_singular"]
	},
};

/**
 * Отримує базовий ключ для специфічного ключа.
 */
export function getBaseKey(specificKey: string): string | null {
	for (const key in semanticHierarchy) {
		const group = semanticHierarchy[key];
		if (group.specific.includes(specificKey)) {
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
