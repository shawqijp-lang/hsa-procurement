--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: production; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA production;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: category_comments; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.category_comments (
    id integer DEFAULT nextval('public.category_comments_id_seq'::regclass) NOT NULL,
    checklist_id integer NOT NULL,
    category_ar text NOT NULL,
    comment character varying(100) NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    location_id integer NOT NULL,
    evaluation_date text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: checklist_templates; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.checklist_templates (
    id integer DEFAULT nextval('public.checklist_templates_id_seq'::regclass) NOT NULL,
    location_id integer NOT NULL,
    category_ar text NOT NULL,
    category_en text NOT NULL,
    task_ar text NOT NULL,
    task_en text NOT NULL,
    description_ar text,
    description_en text,
    "order" integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sub_points jsonb,
    sub_tasks jsonb,
    multi_tasks jsonb,
    company_id integer NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.companies (
    id integer DEFAULT nextval('public.companies_id_seq'::regclass) NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    type text DEFAULT 'regular'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    database_connection text DEFAULT 'current'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    is_template boolean DEFAULT false NOT NULL
);


--
-- Name: daily_checklists; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.daily_checklists (
    id integer DEFAULT nextval('public.daily_checklists_new_id_seq'::regclass) NOT NULL,
    location_id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    checklist_date text NOT NULL,
    tasks jsonb NOT NULL,
    evaluation_notes text,
    completed_at text,
    created_at text,
    offline_id text,
    sync_timestamp integer,
    is_synced boolean DEFAULT true NOT NULL,
    is_encrypted boolean DEFAULT false NOT NULL,
    category_comments jsonb,
    evaluation_time text,
    evaluation_date_time text,
    evaluation_timestamp bigint
);


--
-- Name: dashboard_settings; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.dashboard_settings (
    id integer DEFAULT nextval('public.dashboard_settings_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    section_name character varying(100) NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: kpi_access; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.kpi_access (
    id integer DEFAULT nextval('public.kpi_access_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    granted_by integer NOT NULL,
    company_ids jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: locations; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.locations (
    id integer DEFAULT nextval('public.locations_id_seq'::regclass) NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    icon text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    order_index integer DEFAULT 0 NOT NULL,
    company_id integer NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.login_attempts (
    id integer DEFAULT nextval('public.login_attempts_id_seq'::regclass) NOT NULL,
    identifier text NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp without time zone DEFAULT now(),
    blocked_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: master_evaluations; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.master_evaluations (
    id integer DEFAULT nextval('public.master_evaluations_id_seq'::regclass) NOT NULL,
    evaluation_id text NOT NULL,
    legacy_id integer,
    location_id integer NOT NULL,
    location_name_ar text NOT NULL,
    location_name_en text NOT NULL,
    location_icon text,
    evaluator_id integer NOT NULL,
    evaluator_name text NOT NULL,
    evaluator_role text,
    company_id integer NOT NULL,
    company_name_ar text NOT NULL,
    company_name_en text NOT NULL,
    evaluation_date text NOT NULL,
    evaluation_time text NOT NULL,
    evaluation_date_time text NOT NULL,
    evaluation_timestamp bigint NOT NULL,
    tasks jsonb NOT NULL,
    category_comments jsonb,
    evaluation_items jsonb,
    evaluation_notes text,
    general_notes text,
    overall_rating integer,
    completed_at text,
    created_at text,
    source text DEFAULT 'server'::text NOT NULL,
    is_synced boolean DEFAULT true NOT NULL,
    sync_timestamp bigint,
    offline_id text,
    is_encrypted boolean DEFAULT false NOT NULL,
    total_tasks integer,
    completed_tasks integer,
    average_rating integer,
    system_created_at timestamp without time zone DEFAULT now(),
    system_updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: reports; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.reports (
    id integer DEFAULT nextval('public.reports_id_seq'::regclass) NOT NULL,
    type text NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    location_ids jsonb NOT NULL,
    generated_by integer NOT NULL,
    file_path text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: security_logs; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.security_logs (
    id integer DEFAULT nextval('public.security_logs_id_seq'::regclass) NOT NULL,
    event_type character varying(50) NOT NULL,
    level character varying(20) NOT NULL,
    user_id integer,
    username character varying(255),
    ip_address character varying(45) NOT NULL,
    user_agent text,
    endpoint character varying(500),
    details jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: supervisor_assessment_location_permissions; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.supervisor_assessment_location_permissions (
    id integer DEFAULT nextval('public.supervisor_assessment_location_permissions_id_seq'::regclass) NOT NULL,
    supervisor_id integer NOT NULL,
    location_id integer NOT NULL,
    company_id integer NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: supervisor_user_location_permissions; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.supervisor_user_location_permissions (
    id integer DEFAULT nextval('public.supervisor_user_location_permissions_id_seq'::regclass) NOT NULL,
    supervisor_id integer NOT NULL,
    user_id integer NOT NULL,
    location_id integer NOT NULL,
    granted_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    is_enabled boolean DEFAULT true NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.system_settings (
    id integer DEFAULT nextval('public.system_settings_id_seq'::regclass) NOT NULL,
    user_id integer,
    company_id integer,
    category text NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    is_user_specific boolean DEFAULT true NOT NULL,
    is_company_specific boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: unified_evaluations; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.unified_evaluations (
    id integer DEFAULT nextval('public.unified_evaluations_id_seq'::regclass) NOT NULL,
    evaluation_id text NOT NULL,
    location_id integer NOT NULL,
    location_name_ar text NOT NULL,
    location_name_en text NOT NULL,
    evaluator_id integer NOT NULL,
    evaluator_name text NOT NULL,
    company_id integer NOT NULL,
    company_name_ar text NOT NULL,
    company_name_en text NOT NULL,
    evaluation_timestamp timestamp without time zone NOT NULL,
    evaluation_date text NOT NULL,
    evaluation_time text NOT NULL,
    evaluation_items jsonb NOT NULL,
    general_notes text,
    overall_rating integer,
    is_synced boolean DEFAULT false NOT NULL,
    sync_timestamp timestamp without time zone,
    source text DEFAULT 'offline'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_dashboard_settings; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.user_dashboard_settings (
    id integer DEFAULT nextval('public.user_dashboard_settings_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    dashboard_config jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_location_permissions; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.user_location_permissions (
    id integer DEFAULT nextval('public.user_location_permissions_id_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    location_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: production; Owner: -
--

CREATE TABLE production.users (
    id integer DEFAULT nextval('public.users_id_seq'::regclass) NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    last_login_at timestamp without time zone,
    company_id integer,
    created_by integer,
    can_manage_users boolean DEFAULT false NOT NULL
);


--
-- Data for Name: category_comments; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.category_comments (id, checklist_id, category_ar, comment, user_id, company_id, location_id, evaluation_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: checklist_templates; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.checklist_templates (id, location_id, category_ar, category_en, task_ar, task_en, description_ar, description_en, "order", is_active, sub_points, sub_tasks, multi_tasks, company_id) FROM stdin;
1208	554	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	9	t	\N	\N	\N	7
970	525	منطقة الاستقبال	Reception Area	تنظيف منطقة استقبال المرضى	Clean patient reception area	تنظيف وتعقيم منطقة الانتظار ومكتب الاستقبال	Clean and disinfect waiting area and reception desk	1	t	[]	[]	[{"ar": "تعقيم مكتب الاستقبال", "en": "Disinfect reception desk"}, {"ar": "تنظيف كراسي الانتظار", "en": "Clean waiting chairs"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}]	6
971	525	غرف الفحص	Examination Rooms	تنظيف غرف فحص المرضى	Clean patient examination rooms	تنظيف وتعقيم شامل لغرف الفحص والأجهزة الطبية	Complete cleaning and disinfection of examination rooms and medical equipment	2	t	[]	[]	[{"ar": "تعقيم طاولة الفحص", "en": "Disinfect examination table"}, {"ar": "تنظيف الأجهزة الطبية", "en": "Clean medical equipment"}, {"ar": "تعقيم الأرضيات", "en": "Disinfect floors"}, {"ar": "تنظيف الإضاءة", "en": "Clean lighting"}]	6
972	525	المختبر	Laboratory	تنظيف المختبر الطبي	Clean medical laboratory	تنظيف وتعقيم المختبر والأدوات التحليلية	Clean and disinfect laboratory and analytical tools	3	t	[]	[]	[{"ar": "تعقيم أسطح العمل", "en": "Disinfect work surfaces"}, {"ar": "تنظيف المعدات", "en": "Clean equipment"}, {"ar": "تعقيم الأرضيات", "en": "Disinfect floors"}]	6
973	525	الصيدلية	Pharmacy	تنظيف منطقة الصيدلية	Clean pharmacy area	تنظيف رفوف الأدوية ومنطقة التحضير	Clean medicine shelves and preparation area	4	t	[]	[]	[{"ar": "تنظيف رفوف الأدوية", "en": "Clean medicine shelves"}, {"ar": "مسح منطقة التحضير", "en": "Wipe preparation area"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}]	6
974	525	المرافق الصحية	Sanitary Facilities	تنظيف مرافق المرضى الصحية	Clean patient sanitary facilities	تنظيف وتعقيم شامل للحمامات ومرافق النظافة	Complete cleaning and disinfection of bathrooms and hygiene facilities	5	t	[]	[]	[{"ar": "تعقيم المراحيض", "en": "Disinfect toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم جميع الأسطح", "en": "Disinfect all surfaces"}, {"ar": "تجديد المستلزمات الطبية", "en": "Refill medical supplies"}]	6
976	526	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	f	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
977	526	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	f	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
969	524	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	f	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
978	526	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	f	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
979	526	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	f	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
980	526	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	f	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
981	526	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	f	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
982	526	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	f	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
961	523	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	f	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1086	535	صالة  الطعام المدراء	Directors' Dining Room	النظافة في صالة المدراء	Directors' Dining Room	التنظيف في صالة طعام المدراء	Cleaning in the executive dining hall	14	t	\N	\N	[{"ar": "الارضيات والزوايا اسفل الطاولات", "en": "Floors and corners under tables"}, {"ar": "  الجدران وحواف الجدران ", "en": "Walls and wall edges"}, {"ar": "  الزجاجات وحواف النوافذ والستائر", "en": "Glass, window sills, and curtains"}, {"ar": "  الطاولات والكراسي والتلبيسات", "en": "Tables, chairs, and upholstery"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Ceilings and light fixtures"}, {"ar": " مراواح التهوية والمكيفات ", "en": "Air Conditioners"}, {"ar": "مغاسل الايدي وتوفر مستلزمات النظافة الشخصية ", "en": "Hand sinks and personal hygiene supplies are available."}]	6
1089	535	النظافة والسلوك الشخصية للعاملين	Personal hygiene and behavior of employees	النظافة والسلوك الشخصية للعاملين	Personal hygiene	النظافة والسلوك الشخصية للعاملين	Personal hygiene and behavior of employees	17	t	\N	\N	[{"ar": "نظافة المظهر والبدن", "en": "Cleanliness of appearance and body"}, {"ar": "إرتداء الكوافي المغطية للشعر", "en": "Wearing hair covering caps"}, {"ar": "إرتداء زي مميز نظيف ومرتب للعاملين", "en": "Wearing a clean, tidy and distinctive uniform for employees"}, {"ar": "وجود شهادة صحية للعاملين", "en": "Health certificate for workers"}, {"ar": "جميع العاملين يرتدون حذاء مغلق و قناع وجه", "en": "All employees wear closed shoes and a face mask."}, {"ar": "الايدي نظيفة/ الاظافر مقصوصة و نظيفة", "en": "Clean hands/nails trimmed and clean"}, {"ar": "عامل غسل الاواني يرتدي المريلة و الكوزلوك", "en": "Dishwasher wearing apron and scrubs"}, {"ar": " عدم ارتداء المجوهرات والساعات", "en": "Do not wear jewelry or watches."}, {"ar": " عدم الشرب و الاكل في مكان العمل", "en": "Do not eat or drink at work."}]	6
1102	542	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1103	542	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1105	542	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1107	543	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1108	543	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1109	543	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1110	543	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1111	543	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1112	543	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1106	542	النظافة الترتيب	Outdoor cleanliness	التنظيف والتعقيم	Cleaning & and in the	jhdfvgvsx	jndbkfuhvi	9	t	\N	\N	[{"ar": "الارضيات ", "en": "hgjjg"}, {"ar": "jk'klnd", "en": "mhbvduygc"}]	7
964	524	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	f	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1083	535	النظافة والتطهير في المطبخ	إجراءات التنظيف في والممارسات الصحية في المطبخ	Cleaning procedures and hygiene practices in the kitchen	Cleaning & and hygiene practices in the kitchen	إجراءات التنظيف في والممارسات الصحية في المطبخ	Cleaning procedures and hygiene practices in the kitchen	11	t	\N	\N	[{"ar": "نظافة الارضيات والزوايا اسفل المعدات ", "en": "Clean floors and corners under equipment."}, {"ar": "  الجدران وحواف الجدران ", "en": "walls and wall edges"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Ceilings and lighting fixtures"}, {"ar": "  مراوح وأجهزة الشفط نظيفة وتعمل بشكل مناسب", "en": "Fans and exhaust fans are clean and working properly."}, {"ar": "  نظافة الزجاجات وحواف النوافذ ", "en": "Clean bottles and window sills"}, {"ar": "  الطاولات والمناضد واسطح العمل ", "en": "Tables, desks and work surfaces"}, {"ar": " نظافة الثلاجات وسلامة المواد المخزنة فيها", "en": "Cleanliness of refrigerators and safety of the materials stored in them"}, {"ar": "نظافة المغاسل  ", "en": "Sinks cleaning"}, {"ar": "نظافة أواني الطبخ ", "en": "cleanliness of cooking utensils"}, {"ar": "  نظافة وسلامة صفيات التصريف", "en": "Cleanliness and safety of drains"}, {"ar": " نظافة وسلامة القلايات الكهربائية ،  الشوايات والشول  ،  الافران الكهربائية والسخانات ، فرامات اللحوم والعصارات الكهربائية.........", "en": "Cleanliness and safety of electric fryers, grills and barbecues, electric ovens and heaters, meat grinders and electric juicers...."}, {"ar": "  نظافة وسلامة ادراج حفظ المواد او المعدات", "en": "Cleanliness and safety of drawers for storing materials or equipment"}, {"ar": "  نظافة وسلامة الاواني والقدور والمعدات المستخدمة في الطبخ", "en": "Cleanliness and safety of utensils, pots and equipment used in cooking"}, {"ar": "وسائل إطفاء الحريق ومنظومة الغاز تعمل بشكل آمن ومناسب", "en": "Fire extinguishers and gas systems are operating safely and appropriately."}]	6
1087	535	صالة طعام كبار الضيوف VIP	VIP Dining Room	صالة طعام كبار الضيوف VIP	VIP Dining Room	التنظيف والترتيب والتجهيزات في صالة طعام  VIP	Cleaning, organizing, and preparing the VIP dining hall	15	t	\N	\N	[{"ar": "  البوابة الرئيسية ", "en": "Main Gate"}, {"ar": "  حاويات المخلفات ", "en": "Waste Containers"}, {"ar": "توفر و نظافة وسائل منع ومكافحة الحشرات", "en": "MAvailability and cleanliness of pest control and prevention equipmentain Gate"}, {"ar": "  الارضيات والزوايا اسفل المعدات والطاولات", "en": "Floors and corners under equipment and tables"}, {"ar": "  الجدران وحواف الجدران ", "en": "Walls and wall edges"}, {"ar": "  الزجاجات وحواف النوافذ  والستائر", "en": "Glass, window sills, and curtains"}, {"ar": "  الطاولات والكراسي والتلبيسات", "en": "Tables, chairs, and upholstery"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Ceilings and light fixtures"}, {"ar": "  المكيفات ", "en": "Air Conditioners"}, {"ar": "  مغاسل اليدين  وتوفر مستلزمات النظافة الشخصية", "en": "Hand sinks and personal hygiene supplies are available."}, {"ar": "  دورة المياه", "en": "toilet"}, {"ar": "  نظافة وترتيب لوكرات أدوات التقديم", "en": "Cleanliness and organization of serving utensil lockers"}, {"ar": "  ثلاجة الماء والعصائر ", "en": "Water and juice refrigerator"}]	6
1088	535	مغسلة الاواني	dishwasher	النظافة والاجراءات في مغسلة الاواني	Cleanliness and procedures in the dishwasher	النظافة والاجراءات في مغسلة الاواني	Cleanliness and procedures in the dishwasher	16	t	\N	\N	[{"ar": "نظافة مغسلة الاواني", "en": "Dishwasher cleanliness"}, {"ar": "استخدام الماء النظيف والمنظف المناسب", "en": "Use clean water and appropriate detergent."}, {"ar": "حفظ المخلفات في براميل مقفلة", "en": "Store waste in closed barrels."}, {"ar": "عدم وجود روائح غير مرغوبة", "en": "No unpleasant odors"}, {"ar": "الالتزام بتنظيف الاواني والاطباق بالطرق الصحية", "en": "Commitment to cleaning utensils and dishes in a healthy way"}, {"ar": "غسيل الاواني والقدور بعد تفريغها مباشرةً.", "en": "Wash dishes and pots immediately after emptying them."}, {"ar": "نظافة وسلامة شبوكات حفظ الاواني والمعدات النظيفة", "en": "Cleanliness and safety of the nets for storing clean utensils and equipment"}, {"ar": "  المغاسل وعدم تراكم الرواسب عليها", "en": "Sinks and the lack of sediment accumulation on them"}, {"ar": "  نظافة وسلامة ادراج حفظ المواد او المعدات", "en": "Cleanliness and safety of drawers for storing materials or equipment"}, {"ar": "تعليمات العمل الخاصة بالنظافة معلقة ويتم العمل بها ويوجد سجل فحص", "en": "Cleaning work instructions are posted and are being followed and there is an inspection record."}, {"ar": "يتم عمل مكافحة للحشرات ، وعدم وجودها في الموقع ", "en": "Pest control is done and there is no pest on site."}, {"ar": "  الارضيات والزوايا اسفل المعدات ", "en": "Floors and corners under equipment"}]	6
1009	523	التنظيف العام	General Cleaning	النالمهام الفرعيةظافة في السكن B	Cleanliness in Residence B	تنظيف شامل للسكن والاستراحة والغرف	Thorough cleaning of the residence, lounge, and rooms	10	t	\N	\N	[{"ar": "أرضية المدخل والسلالم نظيفة خالية من الاتربة ", "en": "The entrance floor and stairs are clean and free of dust."}, {"ar": " ارضيات الممرات  والغرف نظيفة خالية من الأتربة", "en": "The floors of the corridors and rooms are clean and free of dust."}, {"ar": " الأثاث والتجهيزات  ودواليب الحفظ وغيرها من التجهيزات نظيفة خالية من الغبار", "en": "The furniture, fixtures, storage cabinets, and other equipment are clean and free of dust."}, {"ar": " النوافذ و الواجهات الزجاجية نظيفة خالية من أي علامات أو اثار  أو البقع", "en": "The windows and glass facades are clean, free from any marks, stains, or spots."}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "The edges of the windows and curtains are clean and free of dirt."}, {"ar": "الجدران  نظيفة خالية من الغبار أو البقع", "en": "The walls are clean, free of dust or stains."}, {"ar": "الاستراحة نظيفة ومرتبة ولا يوجد اثار للاغبرة والبقع والاوساخ ", "en": "The lounge is clean and organized, and there are no traces of dust, stains, or dirt."}, {"ar": "الترتيب للاثاث والتجهيزات مناسب وكل شي نظيف وفي مكانة المناسب", "en": "The arrangement of the furniture and equipment is appropriate, everything is clean and in its proper place."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The trash bin is clean and lined with bags, and the waste is not piled up in it."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are fully available and in good condition."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and in use."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning materials have usage data and are suitable for use."}, {"ar": "أدوات النظافة مكوده (مرمزة في الحمامات والغرف) نظيفة خالية من الاوساخ وجافة  ", "en": "Cleaning tools coded (marked in bathrooms and rooms) are clean, free from dirt, and dry."}, {"ar": "كامل الارضيات نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "All floors are clean and shiny, and corners and walls are clean and free of dirt and deposits."}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Clean toilets, free of limescale and sediment"}, {"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Clean ceilings free of dust and dirt"}, {"ar": "النوافذ ومراوح التهوية وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Windows, ventilators and edges are clean and free of dirt and accumulated dust."}, {"ar": "فتحات التصريف نظيفة خالية من الأوساخ والمخلفات", "en": "Drain holes are clean and free of dirt and debris."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات وجميع الاسطح نظيفة ولامعة وجافة", "en": "8All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}]	6
955	523	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
959	523	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
957	523	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	f	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
958	523	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	f	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
960	523	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	f	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
965	524	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	f	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
962	524	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	f	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
963	524	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	f	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
966	524	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	f	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
967	524	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	f	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
954	523	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل ٠", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
983	527	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
984	527	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
985	527	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
986	527	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
987	527	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
988	527	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
989	527	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
990	527	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1113	543	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
993	528	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	f	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
994	528	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	f	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
995	528	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	f	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
991	528	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	f	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
996	528	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	f	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1114	543	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
999	529	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
1000	529	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
1001	529	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1002	529	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
1003	529	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
1004	529	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1005	529	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1006	529	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1017	530	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1084	535	صالات الطعام الموظفين والموظفات	Staff dining halls	صالات الطعام الموظفين والموظفات	النظافة والترتيب والتجهيزات	النظافة والترتيب والتجهيزات في صالة الموظفين	Cleanliness, organization and equipment in the staff lounge	12	t	\N	\N	[{"ar": "  الأبواب والنوافذ وسلامة الشبك المركب عليها", "en": "Doors, windows and the safety of the mesh installed on them"}, {"ar": " توفر ونظافة وسائل منع ومكافحة الحشرات", "en": "Availability and cleanliness of insect prevention and control methods"}, {"ar": "  الارضيات والزوايا اسفل الطاولات  ", "en": "Floors and corners under tables"}, {"ar": "  الجدران وحواف الجدران ", "en": "Walls and wall edges"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Ceilings and light fixtures"}, {"ar": "  الطاولات والكراسي والتلبيسات", "en": "Tables, chairs, and upholstery"}, {"ar": " مراوح التهوية والمكيفات ", "en": "Air Conditioners"}, {"ar": " نظافة  مغاسل اليدين وتوفر مستلزمات النظافة الشخصية(صابون سائل ، مناديل ورقية او مجفف يدين)", "en": "HaCleanliness of hand basins and availability of personal hygiene supplies (liquid soap, paper towels or hand dryer)nd Sinks"}]	6
1098	542	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1011	525	النظافة العامة	General Cleaning	اجراءات التنظيف والتعقيم في العيادة	Cleaning and disinfection procedures in the clinic	التشيك الدوري لنظافة العيادة	Regular inspection for clinic cleanliness	6	t	\N	\N	[{"ar": " ارضيات ممرات  العيادة واقسامها نظيفة جافة ولامعة خالية من الغبارأو البقع خالية من أي مواد مبعثرة", "en": "The floors of the clinic’s corridors and departments are clean, dry, shiny, free of dust or stains, and free of any scattered materials."}, {"ar": "جميع الأثاث والتجهيزات ودواليب الحفظ نظيفة خالية من الغبار لامعة خالية من الاوساخ", "en": "All furniture, fixtures and storage cabinets are clean, dust-free, shiny and free of dirt."}, {"ar": "الأبواب والقواطع الزجاجية نظيفة خالية من البقع او علامات مرئية ولامعة خالية من الغبار", "en": "Doors and glass partitions are clean, free of stains or visible marks, and shiny and free of dust."}, {"ar": "مكتب الطبيب (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "The doctor's office (floors, walls, windows, doors, countertops, decor, light bulbs, air conditioning vents, surfaces, tables, and fixtures) should be clean and free of dust and dirt."}, {"ar": "الصيدلية(الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "The pharmacy (floors, walls, windows, doors, roof, decoration, light bulbs, air conditioning vents, surfaces, tables and equipment) is clean and free of dust and dirt."}, {"ar": "المختبر  (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "The laboratory (floors, walls, windows, doors, surfaces, decorations, lighting bulbs, air conditioning vents, surfaces, tables, and equipment) should be clean and free of dust and dirt."}, {"ar": "غرفة الرقود (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "The dormitory (floors, walls, windows, doors, ceiling, decoration, light bulbs, air conditioning vents, surfaces, tables and equipment) should be clean and free of dust and dirt."}, {"ar": "غرفة التمريض (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Nursing room (floors, walls, windows, doors, surfaces, decorations, light bulbs, air conditioning vents, surfaces, tables and equipment) clean and free of dust and dirt"}, {"ar": "أماكن الاستقبال (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Reception areas (floors, walls, windows, doors, surfaces, decorations, light bulbs, air conditioning vents, surfaces, tables, and equipment) are clean and free of dust and dirt."}, {"ar": "احواض ومغاسل الايدي مع الصنابير نظيفة خالية من الاوساخ خالية من البقع الصفراء والتكلسات ", "en": "Clean sinks and hand basins with faucets, free of dirt, yellow stains and limescale."}, {"ar": "الستائر واغطية الاسرة  نظيفة خالية من البقع خالية من الغبار ", "en": "Curtains and bed covers are clean, free of stains and dust."}, {"ar": "الأجهزة المخبرية والطبية والبنشات نظيفة خالية من الغبار او أثار علامات", "en": "Laboratory and medical equipment and benches are clean and free of dust or traces of marks."}, {"ar": "سلة النفايات غير متراكمة  (غير ممتلئ) نظيفة من الداخل والخارخ مبطنة بالاكياس جديدة", "en": "Waste basket not overflowing (not full), clean inside and out, lined with new bags"}, {"ar": "أدوات النظافة مكوده (مرمزة) نظيفة خالية من الاوساخ وجافة ", "en": "Cleaning tools are coded, clean, free of dirt, and dry."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}, {"ar": "دورات المياه كامل الارضيات نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "The bathrooms are completely clean and shiny, and the corners and walls are clean and free of dirt and deposits."}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Clean toilets, free of limescale and sediment"}, {"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Clean ceilings free of dust and dirt"}, {"ar": "النوافذ ومراوح التهوية وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Windows, ventilators and edges are clean and free of dirt and accumulated dust."}, {"ar": "فتحات التصريف نظيفة خالية من الأوساخ والمخلفات", "en": "Drain holes are clean and free of dirt and debris."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات وجميع الاسطح نظيفة ولامعة وجافة", "en": "All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning materials have usage information and are suitable for use."}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Personal hygiene supplies such as soap and tissues are available at the sinks."}]	6
1024	526	النظافة العامة	General hygiene	اجراءات التنظيف	Cleaning procedures	التنظيف الشامل لمناطق التجميع	Thorough cleaning of assembly areas	10	t	\N	\N	\N	6
998	528	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	f	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1034	534	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1010	524	النظافة العام	General Cleaning	اجراءات التنظيف والترتيب في الورشة الفنية	Cleaning and organizing procedures in the workshop.	التنظيف الشامل في الورشة الفنية	The thorough cleaning in the art workshop	10	t	\N	\N	[{"ar": "مكاتب الورش (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Workshop offices (floors, walls, windows, doors, roof, decoration, light bulbs, air conditioning vents, surfaces, tables and equipment) are clean and free of dust and dirt."}, {"ar": "أرضية مدخل الورش نظيفة خالية من انسكابات الزيوت خالية من المخلفات خالية من الاوساخ", "en": "The workshop entrance floor is clean, free of oil spills, free of debris, and free of dirt."}, {"ar": "الزوايا والاركان نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "Clean corners and angles, free of debris, dust and scattered debris."}, {"ar": "أسطح التجهيزات والمعدات نظيفة خالية من الغبار خالية من الاوساخ", "en": "Equipment and fixture surfaces are clean, dust-free and free of dirt."}, {"ar": "حول المعدات نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "About the equipment: Clean, free from debris, free from dust and scattered debris."}, {"ar": "النوافذ نظيفة خالية من الغبار أو البقع والمخلفات", "en": "Windows are clean, free of dust, stains, or debris."}, {"ar": "حواف النوافذ نظيفة خالية من البقع والغبار", "en": "Clean window edges, free of stains and dust."}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع ولأوساخ", "en": "The walls and all pendants are clean, free of stains and dirt."}, {"ar": "دورات المياه نظيفة خالية من الأوساخ أو البقع خالية من البقع الصفراء والتكلسات", "en": "Clean toilets, free of dirt or stains, free of yellow stains and limescale"}, {"ar": "سلة النفايات غير متراكمة  (غير ممتلئ) نظيفة من الداخل والخارج مبطنة بالأكياس جديدة", "en": "Wastebasket not overflowing (not full), clean inside and out, lined with new bags"}, {"ar": "أدوات النظافة مكوده (معلمة) نظيفة خالية من الاوساخ وجافة ", "en": "Cleaning tools are coded (marked), clean, free of dirt, and dry."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}]	6
1012	530	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
1013	530	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
1014	530	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1015	530	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
1016	530	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
1018	530	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1019	530	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
975	526	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	f	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
956	523	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	f	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1008	523	نظافة	نظافة	النظافة في السكن A	Cleanliness in housing A	تنظيف شامل للسكن A	Thorough cleaning of residence A	9	t	\N	\N	[{"ar": "أرضية المدخل والسلالم نظيفة خالية من الاتربة ", "en": "The entrance floor and stairs are clean and free of dust."}, {"ar": " ارضيات الممرات  والغرف نظيفة خالية من الأتربة", "en": "The floors of the corridors and rooms are clean and free of dust."}, {"ar": " الأثاث والتجهيزات  ودواليب الحفظ وغيرها من التجهيزات نظيفة خالية من الغبار", "en": "- The furniture, fixtures, and storage cabinets, along with other equipment, are clean and free of dust."}]	6
1020	524	نظافة برادات مياة الشرب	Cleaning drinking water coolers	اجراءات التقييم لبرادات مياه الشرب	Evaluation procedures for drinking water coolers	نظافة برادات مياه الشرب بنوعيها	Cleaning of both types of drinking water coolers	11	t	\N	\N	[{"ar": "نظافة البرادة من الخارج ", "en": "Cleanliness of the cooler from the outside"}, {"ar": "نظافة البرادة من الداخل  ", "en": "Cleanliness of the cooler from the inside"}, {"ar": " المنطقة حول البرادة نظيف ولا يوجد تراكم للمياه ", "en": "The area around the cooler is clean and free of water accumulation"}, {"ar": "يوجد حوض احتواء للماء مع التصريف ", "en": "There is a water catchment basin with a drain"}, {"ar": " موقع البرادة ملائم  بعيد عن الغبار واشعة الشمس ودورات المياه", "en": "The cooler is conveniently located away from dust, sunlight, and restrooms"}, {"ar": "حالة وصلاحية برادة مياه الشرب للاستخدام ", "en": "The condition and suitability of the drinking water cooler for use"}, {"ar": "حالة ونظافة القلتر في البرادة  ", "en": "The condition and cleanliness of the filter in the cooler"}, {"ar": "اكواب الشرب متوفرة ونظيفة ", "en": "The drinking cups are available and clean"}]	6
1021	524	تقييم نظافة دورات المياه	Restroom cleanliness rating	اجراءات التنظيف لدورات المياه	Cleaning procedures for restrooms	تنظيف شامل لمحتوى دورات المياه وحالة التجهيزات	Thorough cleaning of the restroom contents and condition of the fixtures	12	t	\N	\N	[{"ar": "لأرضيات نظيفة ولامعة بالكامل.", "en": "For completely clean and shiny floors."}, {"ar": "الزوايا والأركان خالية من الأوساخ والترسبات.", "en": "Nooks and crannies are free of dirt and debris."}, {"ar": "الجدران نظيفة وخالية من البقع.", "en": "The walls are clean and free of stains."}, {"ar": "الأسقف خالية من الغبار والأوساخ.", "en": "Ceilings are free from dust and dirt."}, {"ar": "النوافذ وحوافها نظيفة وخالية من الأتربة المتراكمة.", "en": "Windows and their edges are clean and free of accumulated dust."}, {"ar": "المراحيض نظيفة تمامًا وخالية من التكلسات والرواسب.", "en": "The toilets are completely clean and free of limescale and sediment."}, {"ar": "مغاسل اليدين والمرايا نظيفة، لامعة، وجافة.", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الأدوات الصحية (مثل المقابض والرولات) نظيفة، لامعة، وجافة.", "en": "All sanitary ware (such as handles and rollers) are clean, shiny, and dry."}, {"ar": "فتحات التصريف نظيفة وخالية من المخلفات .", "en": "Drain holes are clean and free of debris."}, {"ar": "النوافذ ومرواح الشفط نظيفة تعمل بشكل مناسب", "en": "Windows and exhaust fans are clean and working properly."}, {"ar": "سلة النفايات نظيفة، مبطنة بأكياس، ولا تحتوي على مخلفات متراكمة.", "en": "The waste basket is clean, lined with bags, and does not contain accumulated waste."}, {"ar": "أدوات النظافة بحالة جيدة، مخصصة فقط لدورات المياه، ونظيفة بعد الاستخدام.", "en": "Toiletries in good condition, intended for bathroom use only, and cleaned after use."}, {"ar": "دوات النظافة تحفظ في أماكنها المخصصة بعد الاستخدام.", "en": "Cleaning tools should be stored in their designated places after use."}, {"ar": "مواد التنظيف متوفرة بالكامل، من النوع المخصص، وتحمل بيانات استخدام واضحة.", "en": "Cleaning materials are fully available, of the appropriate type, and carry clear usage information."}, {"ar": "ستلزمات النظافة الشخصية (مثل الصابون والمناديل) متوفرة في المغاسل.", "en": "Personal hygiene supplies (such as soap and tissues) are available at the sinks."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ويتم استخدامها حسب الحاجة.", "en": "Personal protective equipment is available and used as needed."}, {"ar": "التجهيزات في دورة المياه تعمل بشكل مناسب (السيفونات والمقابض والطفايات والحنفيات ..)", "en": "The fixtures in the bathroom are working properly (flushes, handles, extinguishers, faucets, etc.)"}]	6
1085	535	التجهيز والتحضير	Preparation and preparation	التنظيف والممارسات الصحية في التحضير	Cleaning and hygiene practices in preparation	التنظيف والممارسات الصحية في التحضير	Cleaning and hygiene practices in preparation	13	t	\N	\N	[{"ar": "عدم وجود أي تراكم المخلفات", "en": "No accumulation of waste"}, {"ar": "الطاولات واسطح التقطيع نظيفة ", "en": "Clean tables and cutting surfaces."}, {"ar": " نظافة المغاسل وتوفر مستلزمات النظافة الشخصية", "en": "Cleanliness of sinks and availability of personal hygiene supplies"}, {"ar": "الالتزام بالتصنيف اللوني للسكاكين ", "en": "Adherence to color classification of knives"}, {"ar": "النوافذ وسلامة الشبك المركب عليها", "en": "Windows and the safety of the mesh installed on them"}, {"ar": "  الارضيات والزوايا اسفل المعدات ", "en": "Floors and corners under equipment"}, {"ar": "  الجدران وحواف الجدران ", "en": "Walls and wall edges"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Ceilings and light fixtures"}]	6
1023	526	النظافة العامة	general cleaning	اجراءات التنظيف في شارع البقري	Cleaning procedures in Al-Baqari Street	تنظيف شامل	comprehensive cleaning	9	t	\N	\N	[{"ar": "الشوارع نظيفة خالية من المخلفات المبعثرة والاتربة", "en": "Clean streets, free of litter and dust"}, {"ar": "الأرصفة نظيفة خالية من الحشائش  والمخلفات المبعثرة والاتربة", "en": "Sidewalks, clean, free of weeds, litter, and dust"}, {"ar": "الساحات والممرات نظيفة خالية من المخلفات المبعثرة والاتربة ومخلفات سيارات التحميل", "en": "Patios and walkways, clean, free of litter, dust, and truck waste"}, {"ar": "غرف التفتيش وقنوات التصريف نظيفة خالية من المخلفات", "en": "Manholes and drainage channels, clean, free of litter"}, {"ar": "منطقة التدخين نظيفة خالية من المخلفات والقمامة واعقاب السجائر والأوراق والمبعثرات", "en": "Smoking areas, clean, free of litter, garbage, cigarette butts, papers, and other litter"}, {"ar": "الحدائق نظيفة خالية من النفايات المبعثرة  ومخلفات الأشجار", "en": "Gardens, clean, free of litter and tree debris"}, {"ar": "مناطق تجميع المخلفات   خالية من  المخلفات  المبعثرة", "en": "Waste collection areas, free of litter"}, {"ar": "حاويات تجميع المخلفات  نظيفة", "en": "Waste collection containers, clean"}, {"ar": "أدوات النظافة  بحالة جيدة ومناسبة لاعمال التنظيف", "en": " Cleaning tools, clean and suitable for cleaning work"}, {"ar": "أدوات النظافة بعد الاستخدام  تحفظ في الأماكن المخصصة", "en": "Cleaning tools, after use, are stored in designated areas"}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment, available and in use"}]	6
992	528	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	f	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
997	528	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	f	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1025	528	النظافة العامة	General cleaning	تنظيف غرفة التكسير	Crushing room cleaning	اجراءات تنظيف غرفة تكسير التالف	Damaged crushing room cleaning procedures	7	t	\N	\N	[{"ar": "الساحات الخارجية والمدخل خالية من تراكم وتكدس المخلفات والمبعثرات", "en": "The outdoor areas and entrance are free from the accumulation and accumulation of waste and debris."}, {"ar": "يتم التكسير و التصريف للمخلفات التالفة اول باول بشكل يومي", "en": "Damaged waste is crushed and disposed of on a daily basis."}, {"ar": "  الارضيات خالية من تكدس وتراكم للمخلفات والمبعثرات ", "en": "Floors are free from clutter and debris."}, {"ar": "ماكينة التكسير نظيفة ويتم تنظيفها نهاية كل وردية عمل", "en": "The crushing machine is clean and is cleaned at the end of each work shift."}, {"ar": "مجاري تصريف المياه نظيفة  ومعقمة بالمنظفات ولا يوجد اي روائح كريهة", "en": "The drains are clean and sterilized with detergents and there are no unpleasant odors."}, {"ar": "الجدران والزوايا نظيفة ولا يوجد اثار تراكم الأوساخ والمخلفات", "en": "The walls and corners are clean and there are no traces of dirt and debris accumulation."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "أدوات النظافة  بحالة جيدة ومناسبة لاعمال التنظيف", "en": "Cleaning tools in good condition and suitable for cleaning work"}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}]	6
1026	523	النظافة في السكن C	Cleanliness in Residence C	النظافة في السكن C	Cleanliness in Residence C	التنظيف الشامل للسكن C مع مرافقة	Comprehensive cleaning of the C residence with accompaniment	11	t	\N	\N	[{"ar": "أرضية المدخل والسلالم نظيفة خالية من الاتربة ", "en": "The entrance floor and stairs are clean and free of dust."}, {"ar": " ارضيات الممرات  والغرف نظيفة خالية من الأتربة", "en": "Clean floors in corridors and rooms, free of dust"}, {"ar": " الأثاث والتجهيزات  ودواليب الحفظ وغيرها من التجهيزات نظيفة خالية من الغبار", "en": "Furniture, fixtures, cabinets, and other equipment are clean and free of dust."}, {"ar": " النوافذ و الواجهات الزجاجية نظيفة خالية من أي علامات أو اثار  أو البقع", "en": "Windows and glass facades are clean and free of any marks, traces or stains."}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "Window surrounds and blinds are clean and free of dirt."}, {"ar": "الجدران  نظيفة خالية من الغبار أو البقع", "en": "Clean walls, free of dust or stains."}, {"ar": "الاستراحة نظيفة ومرتبة ولا يوجد اثار للاغبرة والبقع والاوساخ ", "en": "The rest house is clean and tidy, with no traces of dust, stains or dirt."}, {"ar": "الترتيب للاثاث والتجهيزات مناسب وكل شي نظيف وفي مكانة المناسب", "en": "The furniture and equipment are arranged properly and everything is clean and in its proper place."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are fully available and in good condition."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}, {"ar": "أدوات النظافة مكوده (مرمزة في الحمامات والغرف) نظيفة خالية من الاوساخ وجافة  ", "en": "Toiletries are coded (coded in bathrooms and rooms), clean, free of dirt, and dry."}, {"ar": "كامل الارضيات نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "All floors are clean and shiny, and corners and walls are clean and free of dirt and deposits."}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Clean toilets, free of limescale and sediment"}, {"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Clean ceilings free of dust and dirt"}, {"ar": "النوافذ ومراوح التهوية وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Windows, ventilators and edges are clean and free of dirt and accumulated dust."}, {"ar": "فتحات التصريف نظيفة خالية من الأوساخ والمخلفات", "en": "Drain holes are clean and free of dirt and debris."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات وجميع الاسطح نظيفة ولامعة وجافة", "en": "All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning materials have usage information and are suitable for use."}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Personal hygiene supplies such as soap and tissues are available at the sinks."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}, {"ar": "نظافة البرادة من الخارج والداخل", "en": "Clean the refrigerator from the outside and inside"}, {"ar": "حالة وصلاحية برادة مياه الشرب للاستخدام ", "en": "The condition and suitability of the drinking water cooler for use"}, {"ar": " المنطقة حول البرادة نظيف ولا يوجد تراكم للمياه ", "en": "The area around the cooler is clean and free of water accumulation"}, {"ar": "يوجد حوض احتواء للماء مع التصريف وبحالة نظيفه", "en": "There is a water containment basin with drainage and in clean condition."}, {"ar": " موقع البرادة ملائم  بعيد عن الغبار واشعة الشمس ودورات المياه", "en": "The cooler is conveniently located away from dust, sunlight, and restrooms"}, {"ar": "حالة ونظافة الفلتر في البرادة  ", "en": "The condition and cleanliness of the filter in the cooler"}, {"ar": "اكواب الشرب متوفرة ونظيفة ", "en": "The drinking cups are available and clean"}]	6
1099	542	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1022	524	نظافة شاملة لكل محتوى المنطقة	Comprehensive cleaning of all contents of the area	اجراءات التنظيف في الورشة الفنية	Cleaning procedures in the technical workshop	تقييم مستوى النظافة والترتيب في الورشة الفنية	Evaluating the level of cleanliness and order in the technical workshop	13	f	\N	\N	[{"ar": "مكاتب الورش (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Workshop offices (floors, walls, windows, doors, roof, decoration, light bulbs, air conditioning vents, surfaces, tables and equipment) are clean and free of dust and dirt."}, {"ar": "أرضية مدخل الورش نظيفة خالية من انسكابات الزيوت خالية من المخلفات خالية من الاوساخ", "en": "The workshop entrance floor is clean, free of oil spills, free of debris, and free of dirt."}, {"ar": "الزوايا والاركان نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "Clean corners and angles, free of debris, dust and scattered debris."}, {"ar": "أسطح التجهيزات والمعدات نظيفة خالية من الغبار خالية من الاوساخ", "en": "Equipment and fixture surfaces are clean, dust-free and free of dirt."}, {"ar": "حول المعدات نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "About the equipment: Clean, free from debris, free from dust and scattered debris."}, {"ar": "النوافذ نظيفة خالية من الغبار أو البقع والمخلفات", "en": "Windows are clean, free of dust, stains, or debris."}, {"ar": "حواف النوافذ نظيفة خالية من البقع والغبار", "en": "Clean window edges, free of stains and dust."}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع ولأوساخ", "en": "The walls and all pendants are clean, free of stains and dirt."}, {"ar": "حول المعدات نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "About the equipment: Clean, free from debris, free from dust and scattered debris."}, {"ar": "سلة النفايات غير متراكمة  (غير ممتلئ) نظيفة من الداخل والخارج مبطنة بالأكياس جديدة", "en": "Wastebasket not overflowing (not full), clean inside and out, lined with new bags"}, {"ar": "أدوات النظافة مكوده (معلمة) نظيفة خالية من الاوساخ وجافة ", "en": "Cleaning tools are coded (marked), clean, free of dirt, and dry."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are coded (marked), clean, free of dirt, and dry."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are fully available and in good condition."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}]	6
968	524	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	f	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1007	524	النظافة العامة	Public cleanliness	تنظيف المدخل الرئيسي	Cleaning the main entrance	تنظيف شامل لمحتوى الموقع	The surfaces of the equipment and tools are clean, free of dust and dirt.	9	f	\N	\N	[{"ar": "مكاتب الورش (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Workshops offices (floors, walls, windows, doors, roofs and decorations, lighting lamps, and air conditioning openings, surfaces, tables, and furnishings) are clean and free of dust and dirt."}, {"ar": "أرضية مدخل الورش نظيفة خالية من انسكابات الزيوت خالية من المخلفات خالية من الاوساخ", "en": "The workshop entrance floor is clean, free of oil spills, free of waste, and free of dirt."}, {"ar": "الزوايا والاركان نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "The workshop entrance floor is clean, free of oil spills, free of waste, and free of dirt."}, {"ar": "أسطح التجهيزات والمعدات نظيفة خالية من الغبار خالية من الاوساخ", "en": "The surfaces of the equipment and tools are clean, free of dust and dirt."}]	6
1027	534	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
1028	534	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
1029	534	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1030	534	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
1032	534	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1033	534	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1031	534	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
1035	534	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	9	t	\N	\N	[{"ar": "الأسقف نظيفة خالية من البقع والغبار", "en": "Clean ceilings free of stains and dust"}, {"ar": "الانارة ومراوح التهوية والتكيف خالية من الغبار والاوساخ", "en": "Lighting, ventilation and air conditioning fans are free from dust and dirt."}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع والأوساخ واثار الغبار ", "en": "The walls and all the pendants are clean, free of stains, dirt and dust."}, {"ar": "النوافذ نظيفة خالية من الغبار والبقع", "en": "Clean windows, free of dust and stains."}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "Window surrounds and blinds are clean and free of dirt."}, {"ar": "الوجهات والقواطع الزجاجية نظيفة خالية من أي علامات أو اوساخ وملمعة", "en": "Glass facades and partitions are clean, free of any marks or dirt, and polished."}, {"ar": " الكراسي والطاولات واسطح دواليب وأدوات الحفظ نظيفة وخالية الغبار", "en": "Chairs, tables, cupboard surfaces and storage tools are clean and free of dust."}, {"ar": "الأثاث وجميع التجهيزات المكتبية نظيفة ولامعة خالية من البقع والأوساخ", "en": "Furniture and all office equipment are clean, shiny, and free of stains and dirt."}, {"ar": "التمديدات والاسلاك نظيفة سليمة خالية من الغبار والاوساخ", "en": "Extensions and wires are clean, intact, and free of dust and dirt."}, {"ar": "الأبواب نظيفة خالية من البقع ولامعة", "en": "Doors are clean, spotless and shiny."}, {"ar": "الأرضيات والزوايا نظيفة خالية من الاوساخ والبقع", "en": "Floors and corners are clean, free of dirt and stains."}, {"ar": "سلال  النفايات المخلفات  غير متراكمة نظيفة من الداخل والخارج مبطنة بالاكياس جديدة", "en": "Waste baskets: Waste is not accumulated, clean inside and out, and lined with new bags."}, {"ar": "أدوات النظافة معلمة ومميزة  نظيفة خالية من الاوساخ وبحالة جيدة ", "en": "Cleaning tools are well marked, clean, free of dirt and in good condition."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل ", "en": "Cleaning tools are fully available."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}]	6
1036	534	صالات وقاعات التدريب والاجتماعات	Training and meeting halls and halls	نظافة قاعات التدريب والاجتماعات	Cleanliness of training and meeting rooms	التنظيف والترتيب الشامل لقاعات الاجتماعات والتدريب	Comprehensive cleaning and organization of meeting and training rooms	10	t	\N	\N	[{"ar": "الأسقف نظيفة خالية من البقع والغبار", "en": "a task"}, {"ar": "الانارة ومراوح التهوية والتكيف خالية من الغبار والاوساخ", "en": "a task"}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع والأوساخ واثار الغبار ", "en": "a task"}, {"ar": "النوافذ نظيفة خالية من الغبار والبقع", "en": "a task"}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "a task"}, {"ar": "الوجهات والقواطع الزجاجية نظيفة خالية من أي علامات أو اوساخ وملمعة", "en": "a task"}, {"ar": " الكراسي والطاولات وجميع الاسطح  من وأدوات الحفظ والعرض نظيفة وخالية الغبار", "en": "a task"}, {"ar": "التمديدات سليمة والاسلاك نظيفة خالية من الغبار والاوساخ", "en": "a task"}, {"ar": "الأبواب نظيفة خالية من البقع ولامعة", "en": "General cleaning"}, {"ar": "الأرضيات والزوايا نظيفة خالية من الاوساخ والبقع", "en": "General cleaning"}, {"ar": "سلال  النفايات المخلفات  غير متراكمة نظيفة من الداخل والخارج مبطنة بالاكياس جديدة", "en": "General cleaning"}, {"ar": "أدوات النظافة معلمة ومميزة  نظيفة خالية من الاوساخ وبحالة جيدة ", "en": "General cleaning"}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "General cleaning"}, {"ar": "أدوات النظافة متوفرة بالشكل الكافي والمناسب", "en": "General cleaning"}]	6
1037	534	المدخل الرئيسي والاستقبال	Main entrance and reception	النظافة والترتيب في مدخل الادارة والاستقبال	Cleanliness and order at the entrance to the administration and reception	التنظيف والترتيب الشامل لمدخل الادارة والاستقبال	Cleanliness and order at the entrance to the administration and reception	11	t	\N	\N	[{"ar": "تنظيف شامل لأرضية المدخل والأبواب والمقابض والواجهات الزجاجية ", "en": "Thorough cleaning of the entrance floor, doors, handles and glass facades"}, {"ar": "تنظيف وتلميع الواجهات الزجاجية  والجانبية والفرعية في المداخل ", "en": "General cleaning"}, {"ar": "تنظيف وتلميع الواجهات الزجاجية  والجانبية والفرعية في المداخل ", "en": "General cleaning"}, {"ar": "تنظيف وتلميع الأبواب والمقابض في المداخل ", "en": "General cleaning"}, {"ar": "تنظيف مكتب الاستقبال وتلميع الأثاث والتجهيزات ", "en": "General cleaning"}, {"ar": "ترتيب منطقة الانتظار في الاستقبال ", "en": "General cleaning"}, {"ar": "مسح وتلميع الكراسي والطاولات في الاستقبال ", "en": "General cleaning"}, {"ar": "مسح وتنظيف أرضيات الممرات والسلالم والدربزينات ", "en": "General cleaning"}]	6
1125	546	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1038	534	الادارة العليا	Senior management	النظافة والترتيب في الادارة العليا	Cleanliness and order in senior management	التنظيف والترتيب الشامل لمنطقة الادارة العليا	Comprehensive cleaning and organizing of the upper management area	12	t	\N	\N	[{"ar": "الأسقف نظيفة خالية من البقع والغبار", "en": "Cleaning and organizing"}, {"ar": "الانارة ومراوح التهوية والتكيف خالية من الغبار والاوساخ", "en": "Cleaning and organizing"}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع والأوساخ واثار الغبار ", "en": "Cleaning and organizing"}, {"ar": "النوافذ نظيفة خالية من الغبار والبقع", "en": "Cleaning and organizing"}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "Cleaning and organizing"}, {"ar": "الوجهات والقواطع الزجاجية نظيفة خالية من أي علامات أو اوساخ وملمعة", "en": "Cleaning and organizing"}, {"ar": " الكراسي والطاولات واسطح دواليب وأدوات الحفظ نظيفة وخالية الغبار", "en": "Cleaning and organizing"}, {"ar": "الأثاث وجميع التجهيزات المكتبية نظيفة ولامعة خالية من البقع والأوساخ", "en": "Cleaning and organizing"}, {"ar": "التمديدات والاسلاك نظيفة خالية من الغبار والاوساخ", "en": "Cleaning and organizing"}, {"ar": "الأبواب نظيفة خالية من البقع ولامعة", "en": "Cleaning and organizing"}, {"ar": "الأرضيات والزوايا نظيفة خالية من الاوساخ والبقع", "en": "Cleaning and organizing"}, {"ar": "سلال  النفايات المخلفات  غير متراكمة نظيفة من الداخل والخارج مبطنة بالاكياس جديدة", "en": "Cleaning and organizing"}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning and organizing"}]	6
1039	534	دورات المياه	Restrooms	النظافة والتعقيم لدورات المياه	Cleanliness and sterilization of bathrooms	التنظيف التعقيم الشامل لدورات  المياه	Comprehensive cleaning and sterilization of bathrooms	13	t	\N	\N	[{"ar": "دورات المياه كامل الارضيات نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "النوافذ ومراوح التهوية وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "فتحات التصريف نظيفة خالية من الأوساخ والمخلفات", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Cleaning and sterilization of bathrooms"}, {"ar": " مغاسل اليدين والمرايا نظيفة ولامعة وجافة ", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات وجميع الاسطح نظيفة ولامعة وجافة", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "أدوات النظافة معلمة ومميزة  نظيفة خالية من الاوساخ وبحالة جيدة ", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "أدوات النظافة متوفرة بالشكل الكافي والمناسب ", "en": "Cleaning and sterilization of bathrooms"}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Cleaning and sterilization of bathrooms"}]	6
1101	542	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1040	534	برادات مياه الشرب	drinking water coolers	نظافة برادات مياه الشرب	drinking water coolers	التنظيف والتعقيم لبرادات مياه الشرب	Cleaning and sterilization of drinking water coolers	14	t	\N	\N	[{"ar": "مستوى النظافة من الداخل والخارج للبرادة ", "en": "task "}, {"ar": "حالة وصلاحية برادة مياه الشرب للاستخدام ", "en": "task "}, {"ar": "حالة ونظافة الفلتر في البرادة  ", "en": "task "}, {"ar": " موقع البرادة ملائم  بعيد عن الغبار واشعة الشمس ودورات المياه", "en": "task "}, {"ar": "اكواب الشرب متوفرة ونظيفة ", "en": "task "}, {"ar": "يوجد حوض احتواء للماء مع التصريف ", "en": "task "}, {"ar": " المنطقة حول البرادة نظيف ولا يوجد تراكم للمياه ", "en": "task "}]	6
1041	535	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
1042	535	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
1043	535	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1044	535	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
1045	535	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
1046	535	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1047	535	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1048	535	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
1049	535	البوابات الرئيسية والمداخل الفرعية لمطعم الشركة	Main gates and side entrances to the company restaurant	البوابات والمنطقة حول المطعم	Gates and area around the restaurant	النظافة والمظهر العام للمطعم	Cleanliness and general appearance of the restaurant	9	t	\N	\N	[{"ar": "البوابات الرئيسية نظيفة خالية من الاغبرة والاوساخ والبقع ", "en": "taskcleaning"}, {"ar": "  السلالم والدرج نظيفة خالية من الاغبرة والاوساخ ", "en": "task cleaning"}, {"ar": "توفر و نظافة وسائل منع ومكافحة الحشرات", "en": "task cleaning"}, {"ar": "  الارضيات حول البوابات نظيف خالي من الاتربة والاوساخ ", "en": "task cleaning"}, {"ar": "  الجدران وحواف الجدران  والزجاجات وحواف النوافذ  نظيفة خالية من الاغبرة ", "en": "task cleaning"}, {"ar": "المناطق حول المطعم وعدم تراكم وتواجد المخلفات فيها", "en": "task cleaning"}, {"ar": "عدم تواجد الحشرات والقوارض والحيوانات حول المطعم", "en": "task cltask cleaningeaning"}]	6
1050	535	المخازن في المطعم	Stores in the restaurant	التنظيف في مخازن المواد في المطعم وصلاحيتها	Cleaning and shelf life of restaurant materials	إجراءات التخزين للمواد في المطعم	Storage procedures for materials in the restaurant	10	t	\N	\N	[{"ar": " توفر ونظافة وسائل منع ومكافحة الحشرات", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  الارضيات والزوايا اسفل الأشلاف ", "en": "Storage procedures for materials in the restaurant"}, {"ar": "الخضروات مخزنة بطريقة صحيحة ليست ملامسة للاسطح المعدنية مباشرة", "en": "Storage procedures for materials in the restaurant"}, {"ar": "يتم العمل بنظام الفرز اليومي للخضروات واستبعاد التالفة", "en": "Storage procedures for materials in the restaurant"}, {"ar": "المخزن مزود بنظام تبريد ويعمل بطريقة صحيحة", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  نظافة وسلامة صفايات التصريف", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  الزجاجات وحواف النوافذ ", "en": "Storage procedures for materials in the restaurant"}, {"ar": "   الأسقف ولمبات الاضاءة ", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  الجدران وحواف الجدران ", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  الارضيات والزوايا اسفل الاشلاف ", "en": "Storage procedures for materials in the restaurant"}, {"ar": "  الأبواب والنوافذ وسلامة الشبك المركب عليها", "en": "Storage procedures for materials in the restaurant"}, {"ar": "المواد المخزنة جميعها سليمة المظهر وصالحة للاستهلاك الادمي", "en": "Storage procedures for materials in the restaurant"}, {"ar": "المواد المخزنة غير ملاصقة للجدران وغير مخزنة مباشرة على الارضيات", "en": "Storage procedures for materials in the restaurant"}, {"ar": "المواد المخزنة مرصوصة بطريقة سليمة وتوجد بينها مسافات تسهل الحركة والتفتيش", "en": "Storage procedures for materials in the restaurant"}]	6
1115	544	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1116	544	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1117	544	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1118	544	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1119	544	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1120	544	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1121	544	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1122	544	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1123	546	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1124	546	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1126	546	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1127	546	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1128	546	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1129	546	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1130	546	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1131	547	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1132	547	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1133	547	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1134	547	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1135	547	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1136	547	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1137	547	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1138	547	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1139	548	منطقة الاستقبال	Reception Area	تنظيف منطقة استقبال المرضى	Clean patient reception area	تنظيف وتعقيم منطقة الانتظار ومكتب الاستقبال	Clean and disinfect waiting area and reception desk	1	t	[]	[]	[{"ar": "تعقيم مكتب الاستقبال", "en": "Disinfect reception desk"}, {"ar": "تنظيف كراسي الانتظار", "en": "Clean waiting chairs"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}]	9
1140	548	غرف الفحص	Examination Rooms	تنظيف غرف فحص المرضى	Clean patient examination rooms	تنظيف وتعقيم شامل لغرف الفحص والأجهزة الطبية	Complete cleaning and disinfection of examination rooms and medical equipment	2	t	[]	[]	[{"ar": "تعقيم طاولة الفحص", "en": "Disinfect examination table"}, {"ar": "تنظيف الأجهزة الطبية", "en": "Clean medical equipment"}, {"ar": "تعقيم الأرضيات", "en": "Disinfect floors"}, {"ar": "تنظيف الإضاءة", "en": "Clean lighting"}]	9
1141	548	المختبر	Laboratory	تنظيف المختبر الطبي	Clean medical laboratory	تنظيف وتعقيم المختبر والأدوات التحليلية	Clean and disinfect laboratory and analytical tools	3	t	[]	[]	[{"ar": "تعقيم أسطح العمل", "en": "Disinfect work surfaces"}, {"ar": "تنظيف المعدات", "en": "Clean equipment"}, {"ar": "تعقيم الأرضيات", "en": "Disinfect floors"}]	9
1142	548	الصيدلية	Pharmacy	تنظيف منطقة الصيدلية	Clean pharmacy area	تنظيف رفوف الأدوية ومنطقة التحضير	Clean medicine shelves and preparation area	4	t	[]	[]	[{"ar": "تنظيف رفوف الأدوية", "en": "Clean medicine shelves"}, {"ar": "مسح منطقة التحضير", "en": "Wipe preparation area"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}]	9
1143	548	المرافق الصحية	Sanitary Facilities	تنظيف مرافق المرضى الصحية	Clean patient sanitary facilities	تنظيف وتعقيم شامل للحمامات ومرافق النظافة	Complete cleaning and disinfection of bathrooms and hygiene facilities	5	t	[]	[]	[{"ar": "تعقيم المراحيض", "en": "Disinfect toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم جميع الأسطح", "en": "Disinfect all surfaces"}, {"ar": "تجديد المستلزمات الطبية", "en": "Refill medical supplies"}]	9
1159	550	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1144	549	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1145	549	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1146	549	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1147	549	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1148	549	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1149	549	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1150	549	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1151	549	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1152	550	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1153	550	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1154	550	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1155	550	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1156	550	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1157	550	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1158	550	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1160	551	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	9
1161	551	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	9
1162	551	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	9
1163	551	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	9
1164	551	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	9
1165	551	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	9
1166	551	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	9
1167	551	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	9
1168	552	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1169	552	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1170	552	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	7
1171	552	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1172	552	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1173	552	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1174	552	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	7
1176	553	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1177	553	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1178	553	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	7
1179	553	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1180	553	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1181	553	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1182	553	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	7
1183	553	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1184	554	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1185	554	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1186	554	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	7
1187	554	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1188	554	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1189	554	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1190	554	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	7
1191	554	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1192	556	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1193	556	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1194	556	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	7
1195	556	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1196	556	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1197	556	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1198	556	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	7
1199	556	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1200	557	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	7
1201	557	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	7
1202	557	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	7
1203	557	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	7
1204	557	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	7
1205	557	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	7
1206	557	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	7
1207	557	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1209	554	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	النظافة والتطهير لبرادات مياه الشرب	Cleaning and sanitizing water coolers.	10	t	\N	\N	[{"ar": "نظافة البرادة من الخارج ", "en": "Cleanliness of the cooler from the outside"}, {"ar": "نظافة البرادة من الداخل  ", "en": "Cleanliness of the cooler from the inside"}, {"ar": " المنطقة حول البرادة نظيف ولا يوجد تراكم للمياه ", "en": "The area around the cooler is clean and free of water accumulation"}, {"ar": "يوجد حوض احتواء للماء مع التصريف ", "en": "There is a water catchment basin with a drain"}, {"ar": " موقع البرادة ملائم  بعيد عن الغبار واشعة الشمس ودورات المياه", "en": "The cooler is conveniently located away from dust, sunlight, and restrooms"}, {"ar": "حالة وصلاحية برادة مياه الشرب للاستخدام ", "en": "The condition and suitability of the drinking water cooler for use"}, {"ar": "حالة ونظافة القلتر في البرادة  ", "en": "The condition and cleanliness of the filter in the cooler"}, {"ar": "اكواب الشرب متوفرة ونظيفة ", "en": "The drinking cups are available and clean"}]	7
1210	554	النظافة والتطهير في دورات المياه	Cleaning and sterilization in bathrooms	النظافة والتطهير في دورات المياه	Cleaning and sterilization in bathrooms	النظافة والتطهير في دورات المياه	Cleaning and sterilization in bathrooms	11	t	\N	\N	[{"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "The ceilings are clean and free of dust and dirt."}, {"ar": "النوافذ ومراوح التهوية  سليمة وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "The windows and ventilation fans are intact and clean, free from dirt and accumulated dust."}, {"ar": "دورات المياه كامل الارضيات سليمة  نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "The restrooms have fully intact floors that are clean and shiny, and the corners and walls are clean, free from dirt and deposits."}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Clean toilets, free of limescale and sediment"}, {"ar": "فتحات التصريف سليمة نظيفة خالية من الأوساخ والمخلفات", "en": "Drain holes are clean and free of dirt and debris."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات وجميع الاسطح نظيفة ولامعة وجافة", "en": "All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة بأكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning materials have usage information and are suitable for use."}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Personal hygiene supplies such as soap and tissues are available at the sinks."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}]	7
1100	542	منطقة الاستقبال	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}, {"ar": "تفريغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف الواجهات الجانبية والرفوف واللوحات الدعائية ", "en": "Cleaning the side facades, shelves, and promotional boards"}]	7
1104	542	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	f	[]	[]	[{"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Clean toiClean ceilings free of dust and dirtlets"}, {"ar": "النوافذ ومراوح التهوية سليمة   ونظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Clean Windows, ventilators and edges are clean and free of dirt and accumulated dust.sinks"}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Disinfect sClean toilets, free of limescale and sedimenturfaces"}, {"ar": "فتحات التصريف سليمة نظيفة خالية من الأوساخ والمخلفات", "en": "RefiDrain holes are clean and free of dirt and debris.ll supplies"}, {"ar": "دورات المياه كامل الارضيات سليمة  نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "The bathrooms are completely clean and shiny, and the corners and walls are clean and free of dirt and deposits."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا سليمة  نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع التجهيزات  الصحية مثل المقابض  والرولات والسيفونات والشطافات وقابض الشطافات  وجميع التجهيزات  نظيفة وسليمة وتعمل ", "en": "All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة بأكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام ", "en": "Cleaning materials have usage information and are suitable for use. "}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Personal hygiene supplies such as soap and tissues are available at the sinks. "}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة ", "en": "Personal protective equipment is available and used. "}, {"ar": "مواد النظافة متوفرة بالشكل الكافي والمناسب والمخصص والمميز  ", "en": "Cleaning materials are available in sufficient, appropriate, and designated forms."}]	7
1175	552	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	7
1211	544	النظافة والترتيب في الورشة الفنية	Cleanliness and organization in the art workshop	النظافة العامة	Cleanliness and organization in the art workshop	تنظيف الارضيات والمكاتب وحول المعدات في الورشة	Cleaning the floors, offices, and around the equipment in the workshop	9	t	\N	\N	[{"ar": "مكاتب الورش (الارضيات ، الجدران، النوافذ ، الأبواب ، السطح والديكور ولمبات الإضاءة ، وفتحات التكييف ،والاسطح والطاولات والتجهيزات ) نظيفة خالية من الغبار والاوساخ ", "en": "Workshop offices (floors, walls, windows, doors, roof, decoration, light bulbs, air conditioning vents, surfaces, tables and equipment) are clean and free of dust and dirt."}, {"ar": "أرضية مدخل الورش نظيفة خالية من انسكابات الزيوت خالية من المخلفات خالية من الاوساخ", "en": "The workshop entrance floor is clean, free of oil spills, free of debris, and free of dirt."}, {"ar": "الزوايا والاركان نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "Clean corners and angles, free of debris, dust and scattered debris."}, {"ar": "أسطح التجهيزات والمعدات نظيفة خالية من الغبار خالية من الاوساخ", "en": "Equipment and fixture surfaces are clean, dust-free and free of dirt."}, {"ar": "حول المعدات نظيفة خالية من المخلفات خالية من الاتربة والمخلفات المبعثرة", "en": "About the equipment: Clean, free from debris, free from dust and scattered debris."}, {"ar": "النوافذ نظيفة خالية من الغبار أو البقع والمخلفات", "en": "Windows are clean, free of dust, stains, or debris."}, {"ar": "حواف النوافذ نظيفة خالية من البقع والغبار", "en": "Clean window edges, free of stains and dust."}, {"ar": "الجدران وجميع المعلقات نظيفة خالية من البقع ولأوساخ ", "en": "The walls and all pendants are clean, free of stains and dirt."}, {"ar": "أدوات النظافة سليمة ومتوفرة معلمة (مرمزة) نظيفة خالية من الاوساخ وجافة ", "en": "The cleaning tools are intact and available, the designated teacher is clean, free from dirt, and dry."}]	9
1212	544	نظافة دورات المياه	Cleanliness in dormitories	النظافة والتطهير في دورات المياه	Cleanliness and organization in the art workshop	التنظيف والتعقيم في دورات المياه	Cleaning and sterilization in bathrooms	10	t	\N	\N	[{"ar": "الأسقف في دورات المياه نظيفة خالية من الغبار بحالة جيدة", "en": "The ceilings are clean, dust-free, and in good condition."}, {"ar": " الجدران سليمة نظيفة خالية من البقع  وأثار التكلسات ", "en": "The walls are intact, clean, free from stains and signs of calcareous deposits."}, {"ar": "النوافذ وحوافها  سليمة نظيفة خالية من الاوساخ", "en": "The windows and their edges are intact, clean, and free of dirt."}, {"ar": "فتحات التهوية نظيفة خالية من الاوساخ وبحالة جيدة ", "en": "The ventilation openings are clean, free of dirt, and in good condition."}, {"ar": " مغاسل اليدين والمرايا  سليمة نظيفة ولامعة وجافة ", "en": "The hand sinks and mirrors are intact, clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والرولات , السيفونات والمقابض والشطافات والمثبتات وجميع التجهيزات  نظيفة ولامعة وجافة", "en": "All sanitary tools such as handles, rolls, flush valves, handles, bidets, and fittings are clean, shiny, and dry."}, {"ar": "جميع الارضيات مع الزوايا والفواصل  والحواف سليمة  نظيفة ولامعة خالية من البقع أو اثار الاوساخ", "en": "All floor surfaces, including corners, joints, and edges, are intact, clean, and shiny, free from stains or dirt marks."}, {"ar": "فتحات التصريف سليمة  نظيفة خالية من الأوساخ والمخلفات", "en": "The drainage openings are intact, clean, and free of dirt and debris."}, {"ar": "الأبواب سليمة  نظيفة خالية من البقع و لامعة وجافة", "en": "The doors are intact, clean, free of stains, shiny, and dry."}, {"ar": "سلة النفايات المخلفات سليمة  فيها غير متراكمة  (غير ممتلئ) نظيفة من الداخل والخارج مبطنة بالأكياس جديدة", "en": "The waste basket is clean, not overflowing (not full), clean inside and outside, lined with new bags."}, {"ar": "أدوات النظافة  ومتوفرة معلمة (مرمزة) نظيفة خالية من الاوساخ وجافة ", "en": "The cleaning tools are intact and available, the designated teacher is clean, free from dirt, and dry."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are clean after use and are stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are fully available and in good condition."}, {"ar": "مستلزمات النظافة من الصابون والمناديل متوفرة", "en": "Cleaning supplies such as soap and towels are available."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and in use."}]	9
1213	546	نظافة الشوارع  والساحات الخارجية	Cleanliness of streets and outdoor areas	النظافة والمظهر العام	Cleanliness and overall appearance	نظافة الشوارع والساحات ومناطق التجميع والتدخين	Cleaning of the streets, squares, and gathering and smoking areas.	9	t	\N	\N	[{"ar": "الشوارع سليمة نظيفة خالية من المخلفات المبعثرة والاتربة ومخلفات سيارات التحميل ", "en": "Cleaning of the streets, squares, and gathering and smoking areas."}, {"ar": "الأرصفة نظيفة خالية من الحشائش  والمخلفات المبعثرة والاتربة ", "en": "The sidewalks are clean and free of weeds, scattered waste, and dust."}, {"ar": "الساحات والممرات سليمة نظيفة خالية من المخلفات المبعثرة والاتربة", "en": "The squares and corridors are intact, clean, and free of scattered waste and dust."}, {"ar": "غرف التفتيش وقنوات التصريف  سليمة نظيفة خالية من المخلفات", "en": "The manholes and drainage channels are intact, clean, and free of waste."}, {"ar": "منطقة التدخين متوفرة  ومناسبة  نظيفة خالية من المخلفات والقمامة واعقاب السجائر والأوراق والمبعثرات", "en": "The smoking area is available, suitable, clean, free from waste and garbage, cigarette butts, papers, and litter."}, {"ar": "مناطق تجميع وتحميل المخلفات ممميزة ومعرفة نظيفة خالية من المخلفات المبعثرة خالية من الأوساخ", "en": "Areas for collecting and loading waste are designated and identified, clean and free from scattered waste and dirt."}, {"ar": "ارضية وحاويات تجميع المخلفات سليمة  نظيفة خالية من الاوساخ خالية من البقع", "en": "The ground and waste collection containers are intact, clean, free of dirt, and free of stains."}, {"ar": "سلة النفايات المخلفات فيها غير متراكمة نظيفة من الداخل والخارج مبطنة بالأكياس جديدة", "en": "The trash bin is not cluttered with waste, it is clean inside and outside, lined with new bags."}, {"ar": "أدوات النظافة معلمة نظيفة خالية من الاوساخ وجافة  وبحالة جيدة ", "en": "Cleaning tools are clean, free of dirt, dry, and in good condition."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are clean after use and are stored in designated places."}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل ", "en": "Cleaning tools are available in full form."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and in use."}]	9
1214	547	النظافة والترتيب والتجهيزات في السكنات الداخلية	Cleanliness, organization, and arrangements in the accommodations A	النظافة والترتيب والتجهيزات في السكنات A	Cleanliness, organization, and arrangements in the accommodations A	النظافة والترتيب والتجهيزات في السكنات الداخلية	Cleanliness, organization, and arrangements in the dormitories	9	t	\N	\N	[{"ar": "أرضية المدخل والسلالم نظيفة خالية من الاتربة ", "en": "The entrance floor and stairs are clean and free of dust."}, {"ar": " ارضيات الممرات  والغرف نظيفة خالية من الأتربة", "en": "Clean floors in corridors and rooms, free of dust"}, {"ar": " الأثاث والتجهيزات  ودواليب الحفظ وغيرها من التجهيزات نظيفة خالية من الغبار", "en": "Furniture, fixtures, cabinets, and other equipment are clean and free of dust."}, {"ar": " النوافذ و الواجهات الزجاجية نظيفة خالية من أي علامات أو اثار  أو البقع", "en": "Windows and glass facades are clean and free of any marks, traces or stains."}, {"ar": "حواف النوافذ والستائر نظيفة خالية من الاوساخ", "en": "Window surrounds and blinds are clean and free of dirt."}, {"ar": "الجدران  نظيفة خالية من الغبار أو البقع", "en": "Clean walls, free of dust or stains."}, {"ar": "الاستراحة والتجهيزات مناسبة نظيفة ومرتبة ولا يوجد اثار للأغبرة والبقع والاوساخ ", "en": "The rest house is clean and tidy, with no traces of dust, stains or dirt."}, {"ar": "الترتيب للاثاث والتجهيزات مناسب وكل شي نظيف وفي مكانة المناسب", "en": "The furniture and equipment are arranged properly and everything is clean and in its proper place."}, {"ar": "سلة النفايات نظيفة ومبطنة بأكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "en": "Cleaning tools are cleaned after use and stored in designated places. "}, {"ar": "أدوات النظافة متوفرة بالشكل الكامل وبحالة جيدة", "en": "Cleaning tools are fully available and in good condition."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "en": "Personal protective equipment is available and used."}, {"ar": "أدوات النظافة مكوده (مرمزة في الحمامات والغرف) نظيفة خالية من الاوساخ وجافة  ", "en": "Toiletries are coded (coded in bathrooms and rooms), clean, free of dirt, and dry."}, {"ar": "دورات المياه كامل الارضيات نظيفة لامعة والزوايا والجدران نظيفة خالية من الاوساخ والترسبات", "en": "All floors are clean and shiny, and corners and walls are clean and free of dirt and deposits."}, {"ar": "المراحيض نظيفة خالية من التكلسات والرواسب", "en": "Clean toilets, free of limescale and sediment"}, {"ar": "الأسقف نظيفة خالية من الغبار  والاوساخ", "en": "Clean ceilings free of dust and dirt"}, {"ar": "النوافذ ومراوح التهوية وحوافه نظيفة خالية من الاوساخ والغبرة المتراكمة", "en": "Windows, ventilators and edges are clean and free of dirt and accumulated dust."}, {"ar": "فتحات التصريف نظيفة خالية من الأوساخ والمخلفات", "en": "Drain holes are clean and free of dirt and debris."}, {"ar": "الأبواب نظيفة خالية من البقع و لامعة وجافة", "en": "Doors are clean, spotless, shiny and dry."}, {"ar": " مغاسل اليدين والمرايا  سليمة نظيفة ولامعة وجافة ", "en": "Hand sinks and mirrors are clean, shiny, and dry."}, {"ar": "جميع الادوات الصحية مثل المقابض  والسيفونات سليمة وجميع الاسطح نظيفة ولامعة وجافة", "en": "All sanitary ware such as handles, rollers and all surfaces are clean, shiny and dry."}, {"ar": "سلة النفايات نظيفة ومبطنة بأكياس  والمخلفات غير متراكمة فيها", "en": "The waste basket is clean, lined with bags, and there is no waste accumulating in it."}, {"ar": "مواد التنظيف توجد عليها بيانات استخدام ومناسبة  للاستخدام", "en": "Cleaning materials have usage information and are suitable for use."}, {"ar": "مستلزمات النظافة الشخصية  من الصابون والمناديل متوفرة بالمغاسل ", "en": "Personal hygiene supplies such as soap and tissues are available at the sinks."}, {"ar": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة ", "en": "Personal protective equipment is available and used. "}]	9
1295	568	المداخل والمخارج	Entrances and Exits	تنظيف المدخل الرئيسي والأبواب	Clean main entrance and doors	تنظيف شامل لأرضية المدخل والأبواب والمقابض	Complete cleaning of entrance floor, doors and handles	1	t	[]	[]	[{"ar": "مسح أرضية المدخل", "en": "Mop entrance floor"}, {"ar": "تنظيف الأبواب الزجاجية", "en": "Clean glass doors"}, {"ar": "تلميع مقابض الأبواب", "en": "Polish door handles"}]	6
1296	568	المداخل والمخارج	Entrances and Exits	تنظيف المداخل الفرعية	Clean secondary entrances	تنظيف وتعقيم جميع المداخل الجانبية والفرعية	Clean and disinfect all side and secondary entrances	2	t	[]	[]	[{"ar": "تنظيف المداخل الجانبية", "en": "Clean side entrances"}, {"ar": "تعقيم المقابض والأسطح", "en": "Disinfect handles and surfaces"}]	6
1297	568	الاستقبال والردهات	Reception and Lobbies	تنظيف منطقة الاستقبال	Clean reception area	تنظيف مكتب الاستقبال والكراسي ومنطقة الانتظار	Clean reception desk, chairs and waiting area	3	t	[]	[]	[{"ar": "تنظيف مكتب الاستقبال", "en": "Clean reception desk"}, {"ar": "ترتيب منطقة الانتظار", "en": "Organize waiting area"}, {"ar": "مسح الكراسي والطاولات", "en": "Wipe chairs and tables"}]	6
1298	568	الاستقبال والردهات	Reception and Lobbies	تنظيف الردهات والممرات	Clean lobbies and corridors	مسح وتنظيف أرضيات الردهات وجميع الممرات	Sweep and clean lobby floors and all corridors	4	t	[]	[]	[{"ar": "كنس الأرضيات", "en": "Sweep floors"}, {"ar": "مسح الممرات", "en": "Mop corridors"}, {"ar": "تنظيف الجدران", "en": "Clean walls"}]	6
1299	568	المكاتب	Offices	تنظيف المكاتب الإدارية	Clean administrative offices	تنظيف أسطح المكاتب والكراسي والأرضيات	Clean desk surfaces, chairs and floors	5	t	[]	[]	[{"ar": "مسح أسطح المكاتب", "en": "Wipe desk surfaces"}, {"ar": "تنظيف الكراسي", "en": "Clean chairs"}, {"ar": "تنظيف الأرضيات", "en": "Clean floors"}]	6
1300	568	المكاتب	Offices	تفريغ سلال المهملات وتنظيفها	Empty and clean trash bins	إفراغ جميع سلال المهملات وتنظيفها وتعقيمها	Empty all trash bins and clean and disinfect them	6	t	[]	[]	[{"ar": "إفراغ سلال المهملات", "en": "Empty trash bins"}, {"ar": "تنظيف وتعقيم السلال", "en": "Clean and disinfect bins"}]	6
1301	568	دورات المياه	Restrooms	تنظيف دورات المياه الرئيسية	Clean main restrooms	تنظيف شامل وتعقيم دورات المياه والمرافق الصحية	Complete cleaning and disinfection of restrooms and sanitary facilities	7	t	[]	[]	[{"ar": "تنظيف المراحيض", "en": "Clean toilets"}, {"ar": "تنظيف الأحواض", "en": "Clean sinks"}, {"ar": "تعقيم الأسطح", "en": "Disinfect surfaces"}, {"ar": "تجديد المستلزمات", "en": "Refill supplies"}]	6
1302	568	دورات المياه	Restrooms	تنظيف المرايا والأرضيات	Clean mirrors and floors	تنظيف وتلميع المرايا ومسح أرضيات دورات المياه	Clean and polish mirrors and mop restroom floors	8	t	[]	[]	[{"ar": "تنظيف المرايا", "en": "Clean mirrors"}, {"ar": "مسح الأرضيات", "en": "Mop floors"}]	6
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.companies (id, name_ar, name_en, type, status, database_connection, created_at, updated_at, description, is_active, is_template) FROM stdin;
1	الشؤون الإدارية الإدارة العامة	Administrative Affairs General Management	general_management	active	current	2025-08-05 22:40:02.186067	2025-08-05 22:40:02.186067	\N	t	f
6	الالبان و الاغذية الوطنية المحدودة الحديدة	NADFOOD H	regular	active	current	2025-08-10 09:54:10.420089	2025-08-10 09:54:10.420089	متخصصة في تصنيع منتجات الألبان	t	f
2	قالب الشركات الجديدة	General Companies Template	general	active	current	2025-08-05 22:40:02.186067	2025-08-05 22:40:02.186067	شركة مرجعية عامة لإنشاء جميع أنواع الشركات الجديدة - لا تستخدم للعمل	t	t
7	الشركة اليمنية للمطاحن و صوامع الغلال الحديدة	YCFMS	regular	active	current	2025-08-13 08:52:13.274047	2025-08-13 08:52:13.274047	متخصصة في انتاج الدقيق	t	f
9	الشركة اليمنية لتكرير السكر	YCSR	regular	active	current	2025-08-31 06:39:30.659089	2025-08-31 06:39:30.659089	متخصصة في تكرير السكر	t	f
10	شركة راس عيسى الصناعية	RIIC	regular	active	current	2025-10-07 09:34:00.27329	2025-10-07 09:34:00.27329	شركة متخصصة في صناعة الاكياس و المنسوجات	t	f
11	الشركة اليمنية للتحلية	YCD	regular	active	current	2025-10-07 12:55:39.024442	2025-10-07 12:55:39.024442	شركة متخصصة لانتاج المياه المعدنية	t	f
12	شركة شوقي	shawqi	regular	active	current	2025-10-08 05:13:03.941225	2025-10-08 05:13:03.941225	شركة مقاولات	t	f
\.


--
-- Data for Name: daily_checklists; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.daily_checklists (id, location_id, user_id, company_id, checklist_date, tasks, evaluation_notes, completed_at, created_at, offline_id, sync_timestamp, is_synced, is_encrypted, category_comments, evaluation_time, evaluation_date_time, evaluation_timestamp) FROM stdin;
\.


--
-- Data for Name: dashboard_settings; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.dashboard_settings (id, user_id, section_name, is_visible, created_at, updated_at) FROM stdin;
1	54	dashboard	t	2025-08-13 11:40:08.095179	2025-08-13 11:40:08.095179
2	54	locations	t	2025-08-13 11:40:08.865039	2025-08-13 11:40:08.865039
3	54	checklists	t	2025-08-13 11:40:08.865039	2025-08-13 11:40:08.865039
4	54	settings	t	2025-08-13 11:40:08.865039	2025-08-13 11:40:08.865039
5	54	sync	t	2025-08-13 11:40:08.865039	2025-08-13 11:40:08.865039
6	54	evaluations	f	2025-08-13 11:40:09.553483	2025-08-13 11:40:09.553483
7	54	reports	f	2025-08-13 11:40:09.553483	2025-08-13 11:40:09.553483
8	54	users	f	2025-08-13 11:40:09.553483	2025-08-13 11:40:09.553483
9	54	analytics	f	2025-08-13 11:40:09.553483	2025-08-13 11:40:09.553483
10	59	enhanced-general-manager	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
11	59	analytics	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
12	59	company-backup	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
13	59	user-management	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
14	59	dashboard	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
15	59	locations	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
16	59	checklists	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
17	59	reports	t	2025-08-14 15:03:11.328036	2025-08-14 15:03:11.328036
\.


--
-- Data for Name: kpi_access; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.kpi_access (id, user_id, granted_by, company_ids, is_active, created_at, updated_at) FROM stdin;
2	33	33	[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]	t	2025-08-14 14:47:23.445576	2025-08-14 14:47:23.445576
4	59	33	[6, 7]	t	2025-08-14 15:07:41.118013	2025-08-14 15:07:41.118013
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.locations (id, name_ar, name_en, icon, description, is_active, created_at, updated_at, order_index, company_id) FROM stdin;
544	النظافة وبيئة العمل بالورش	Cleanliness and work environment in workshops	building	التنظيف والترتيب في الورش الفنية	t	2025-08-31 13:19:54.038619	2025-08-31 13:19:54.038619	0	9
545	الشوراع العامة والساحات 	Public streets and squares	map-pin	النظافة والمظهر العام 	t	2025-08-31 13:20:44.445325	2025-08-31 13:20:44.445325	0	9
546	مبني بوابة الشركة الرئيسية	Main company gate building	building	التنظيف والترتيب في مبنى البوابة الرئيسية  	t	2025-08-31 13:21:57.672818	2025-08-31 13:21:57.672818	0	9
547	السكنات الداخلية 	Internal housing	building	النظافة والترتيب في السكنات الداخلية 	t	2025-08-31 13:22:49.088766	2025-08-31 13:22:49.088766	0	9
548	العيادة الطبية 	Medical clinic	clinic-medical	النظافة والتعقيم في عيادة الشركة 	t	2025-08-31 13:23:59.955668	2025-08-31 13:23:59.955668	0	9
549	مكتب الزوار 	Visitors Office	building	النظافة والترتيب والتجهيزات في مكتب الزائرين 	t	2025-08-31 13:26:24.943627	2025-08-31 13:26:24.943627	0	9
550	مكتب المبيعات بوابة الشركة 	Sales Office Company Portal	building	التنظيف والترتيب في مكاتب المبيعات 	t	2025-08-31 13:27:36.968394	2025-08-31 13:27:36.968394	0	9
551	ادارة مبيعات الشركة 	Sales ManagementCompany sales management	building	النظافة والترتيب في ادارة المبيعات 	t	2025-08-31 13:29:22.433773	2025-08-31 13:29:22.433773	0	9
552	المطعم 	The restaurant	building	النظافة والترتيب في المطعم 	t	2025-09-01 11:54:27.46519	2025-09-01 11:54:27.46519	0	7
553	النظافة وبيئة العمل بالورش	Cleanliness and work environment in workshops	building	النظافة والترتيب في الورش الفنية 	t	2025-09-01 11:55:04.153452	2025-09-01 11:55:04.153452	0	7
523	السكنات الداخلية 	السكُنات الداخلية	building	اجراءات التنظيف سكنات الموظفين الداخلي 	t	2025-08-13 13:35:29.796807	2025-08-13 13:35:29.796807	0	6
524	الورشة الفنية 	The workshop	building	النظافة في الورشة الفنية 	t	2025-08-13 13:36:09.404455	2025-08-13 13:36:09.404455	0	6
554	السكنات الداخلية 	Internal housing	building	التنظيف والترتيب في السكنات الداخلية 	t	2025-09-01 11:56:34.775146	2025-09-01 11:56:34.775146	0	7
526	الشوارع والساحات الخارجية	The streets and outdoor squares	building	التنظيف في الساحات والشوارع الخارجية 	t	2025-08-13 13:37:53.135523	2025-08-13 14:26:25.399	0	6
530	الشوراع العامة والساحات 	Public streets and squares	building	النظافة في الشوراع والساحات 	t	2025-08-13 14:55:21.018184	2025-08-13 14:55:21.018184	0	6
527	مواقف السيارات ونقاط التدخين والمخلفات 	Parking spaces, smoking points, and waste	building	مواقف السيارات ونقاط التدخين والمخلفات 	t	2025-08-13 13:39:12.782582	2025-08-14 08:33:51.2	0	6
529	مبني بوابة الشركة الرئيسية	Main Company Gate Building	building	اجراءات التنظيف والترتيب في البوابة الرئيسية	t	2025-08-13 13:41:40.512661	2025-08-14 08:34:21.175	0	6
528	ادارة المخلفات 	Waste Management	building	تصريف المخلفات في الشركة واجراءت التصريف 	t	2025-08-13 13:40:07.297978	2025-08-16 17:17:54.055	0	6
512	سيلسلباسل	ءييئبائابئيب	building	ئيبا[ئب	f	2025-08-12 18:17:18.89701	2025-08-17 19:14:30.854	0	6
534	مبنى الادارة 	Administration building	building	اجراءات التنظيف والترتيب في مبنى الادارة 	t	2025-08-19 18:32:54.023595	2025-08-19 18:32:54.023595	0	6
536	الوحدة	house	building		f	2025-08-21 08:29:54.835694	2025-08-22 14:29:45.439	0	6
538	Hhhhhh	Jjjjjj	building		f	2025-08-22 14:59:54.456816	2025-08-22 19:25:08.832	0	6
537	Ggggg	Uuuuu	building		f	2025-08-22 14:43:10.858004	2025-08-22 19:25:41.974	0	6
525	العيادة الطبية 	The medical clinic	clinic-medical	التنظيف في عيادة الشركة 	t	2025-08-13 13:37:00.30009	2025-08-23 12:22:13.783	0	6
535	المطعم 	The restaurant	building	إجراءات التنظيف في والممارسات الصحية في مطعم الشركة 	t	2025-08-19 19:30:31.567197	2025-08-23 12:22:40.75	0	6
540	المطعم 	The restaurant	building		f	2025-08-23 12:21:37.082379	2025-08-23 12:22:49.214	0	6
541	قسفعسقف	سفعشسفيبت	building	سيفشعبتا	f	2025-08-31 09:18:24.825158	2025-08-31 09:26:25.085	0	7
542	المباني الإدارية 	Administrative Buildings	building	التنظيف الشامل 	t	2025-08-31 09:26:43.917254	2025-08-31 09:26:43.917254	0	7
543	المطعم 	The restaurant	building	النظافة والاشتراطات الصحية والممارسات في المطعم 	t	2025-08-31 13:18:46.589345	2025-08-31 13:18:46.589345	0	9
555	الساحات الخارجية والشوارع 	Public streets and squares	map-pin	النظافة الساحات الخارجية والشوارع 	t	2025-09-01 11:58:10.655897	2025-09-01 11:58:10.655897	0	7
556	مخازن المهمات وقطع الغيار 	Stores of equipment and spare parts	building	التنظيف والترتيب في مخازن قطع الغيار والمهمات 	t	2025-09-01 12:04:35.823619	2025-09-01 12:04:35.823619	0	7
557	مخازن النخالة 	Bran warehouses	building	التنظيف والترتيب في مخازن النخالة 	t	2025-09-01 12:05:17.946256	2025-09-01 12:05:17.946256	0	7
558	جميل	جمال	building	متجمل	f	2025-09-04 22:14:30.721067	2025-09-04 22:31:28.911	0	6
559	هههههه	هههههه	building	هههههه	f	2025-09-04 23:40:21.158298	2025-09-06 18:36:14.922	0	6
563	سلطان	علي	building		f	2025-09-06 20:48:18.804452	2025-09-07 20:34:59.428	0	6
560	سمير	باشا	building	هال	f	2025-09-06 18:40:13.505938	2025-09-07 20:35:08.265	0	6
564	علوي	علوي	building		f	2025-09-11 17:30:45.754513	2025-09-11 17:35:43.974	0	6
565	علوي محمد	علوي	building		f	2025-09-11 18:16:51.929171	2025-09-11 19:26:37.729	0	6
567	ممممم	مانمتىمنىم	building		f	2025-09-11 19:30:36.602228	2025-09-11 22:34:26.184	0	6
568	تطوير	تطوير	building		t	2025-09-12 14:38:21.273025	2025-09-12 14:38:21.273025	0	6
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.login_attempts (id, identifier, failed_attempts, last_attempt_at, blocked_until, created_at, updated_at) FROM stdin;
5	34.173.64.10	3	2025-08-05 23:10:06.81	\N	2025-08-05 22:47:55.272	2025-08-05 23:10:06.81
9	34.29.134.82	0	2025-08-05 23:08:43.971	\N	2025-08-05 23:08:43.971	2025-08-05 23:13:09.853
11	35.225.171.39	1	2025-08-05 23:13:52.743	\N	2025-08-05 23:13:52.743	2025-08-05 23:13:52.743
8	hsa_group_admin	1	2025-08-05 23:23:29.393	\N	2025-08-05 23:08:43.873	2025-08-05 23:23:29.393
12	34.68.159.223	0	2025-08-05 23:23:29.483	\N	2025-08-05 23:23:29.483	2025-08-05 23:24:11.406
13	34.123.199.62	1	2025-08-05 23:24:26.803	\N	2025-08-05 23:24:26.803	2025-08-05 23:24:26.803
14	34.60.109.55	1	2025-08-05 23:33:34.78	\N	2025-08-05 23:33:34.78	2025-08-05 23:33:34.78
4	34.170.236.4	3	2025-08-05 23:33:43.229	\N	2025-08-05 22:47:31.188	2025-08-05 23:33:43.229
6	admin	5	2025-08-05 23:40:51.682	2025-08-05 23:55:51.682	2025-08-05 23:05:31.208	2025-08-05 23:40:51.682
15	10.82.2.23	1	2025-08-05 23:40:51.716	\N	2025-08-05 23:40:51.716	2025-08-05 23:40:51.716
10	general_manager	0	2025-08-05 23:10:06.711	\N	2025-08-05 23:10:06.711	2025-08-06 00:02:15.716
7	admin-hodeidah	4	2025-08-06 00:02:16.094	\N	2025-08-05 23:05:46.742	2025-08-06 00:02:16.094
2	127.0.0.1	1	2025-08-06 00:02:16.124	\N	2025-08-05 08:33:41.279	2025-08-06 00:02:16.124
\.


--
-- Data for Name: master_evaluations; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.master_evaluations (id, evaluation_id, legacy_id, location_id, location_name_ar, location_name_en, location_icon, evaluator_id, evaluator_name, evaluator_role, company_id, company_name_ar, company_name_en, evaluation_date, evaluation_time, evaluation_date_time, evaluation_timestamp, tasks, category_comments, evaluation_items, evaluation_notes, general_notes, overall_rating, completed_at, created_at, source, is_synced, sync_timestamp, offline_id, is_encrypted, total_tasks, completed_tasks, average_rating, system_created_at, system_updated_at) FROM stdin;
1	master_2025_09_10_212221_534_58	52	534	مبنى الادارة 	Administration building	building	58	Salah	user	6	الالبان و الاغذية الوطنية المحدودة الحديدة	NADFOOD H	2025-09-10	00:00:00	2025-09-10T00:00:00.000Z	1757539341957	[{"notes": "", "rating": 1, "completed": true, "templateId": 1027, "itemComment": "", "subTaskRatings": [{"rating": 1, "taskName": "مسح أرضية المدخل", "taskIndex": 0}, {"rating": 1, "taskName": "تنظيف الأبواب الزجاجية", "taskIndex": 1}, {"rating": 1, "taskName": "تلميع مقابض الأبواب", "taskIndex": 2}]}, {"notes": "", "rating": 0, "completed": false, "templateId": 1028, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1029, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1030, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1031, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1032, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1033, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1034, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1035, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1036, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1037, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1038, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1039, "itemComment": "", "subTaskRatings": []}, {"notes": "", "rating": 0, "completed": false, "templateId": 1040, "itemComment": "", "subTaskRatings": []}]	\N	\N	نت	\N	20	\N	2025-09-10T04:58:57.087Z	daily_checklists	t	1757480336	\N	f	14	1	20	2025-09-10 21:22:22.044119	2025-09-10 21:22:22.044119
2	master_2025_09_11_230911_327_528_43_ybu7e1	\N	528	ادارة المخلفات 	Waste Management	building	43	مدير الشؤون الادارية	admin	6	الالبان و الاغذية الوطنية المحدودة الحديدة	NADFOOD H	2025-09-11	23:09:11	2025-09-11T23:09:11.229Z	1757632151229	[{"notes": "", "rating": 2, "completed": true, "templateId": 1025, "itemComment": "مسار", "subTaskRatings": [{"rating": 2, "taskName": "الساحات الخارجية والمدخل خالية من تراكم وتكدس المخلفات والمبعثرات", "taskIndex": 0}, {"rating": 2, "taskName": "يتم التكسير و التصريف للمخلفات التالفة اول باول بشكل يومي", "taskIndex": 1}, {"rating": 2, "taskName": "  الارضيات خالية من تكدس وتراكم للمخلفات والمبعثرات ", "taskIndex": 2}, {"rating": 2, "taskName": "ماكينة التكسير نظيفة ويتم تنظيفها نهاية كل وردية عمل", "taskIndex": 3}, {"rating": 2, "taskName": "الجدران والزوايا نظيفة ولا يوجد اثار تراكم الأوساخ والمخلفات", "taskIndex": 5}, {"rating": 2, "taskName": "مجاري تصريف المياه نظيفة  ومعقمة بالمنظفات ولا يوجد اي روائح كريهة", "taskIndex": 4}, {"rating": 2, "taskName": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "taskIndex": 6}, {"rating": 4, "taskName": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "taskIndex": 9}, {"rating": 3, "taskName": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "taskIndex": 8}, {"rating": 1, "taskName": "أدوات النظافة  بحالة جيدة ومناسبة لاعمال التنظيف", "taskIndex": 7}]}]	{}	[{"notes": "", "rating": 2, "completed": true, "templateId": 1025, "itemComment": "مسار", "subTaskRatings": [{"rating": 2, "taskName": "الساحات الخارجية والمدخل خالية من تراكم وتكدس المخلفات والمبعثرات", "taskIndex": 0}, {"rating": 2, "taskName": "يتم التكسير و التصريف للمخلفات التالفة اول باول بشكل يومي", "taskIndex": 1}, {"rating": 2, "taskName": "  الارضيات خالية من تكدس وتراكم للمخلفات والمبعثرات ", "taskIndex": 2}, {"rating": 2, "taskName": "ماكينة التكسير نظيفة ويتم تنظيفها نهاية كل وردية عمل", "taskIndex": 3}, {"rating": 2, "taskName": "الجدران والزوايا نظيفة ولا يوجد اثار تراكم الأوساخ والمخلفات", "taskIndex": 5}, {"rating": 2, "taskName": "مجاري تصريف المياه نظيفة  ومعقمة بالمنظفات ولا يوجد اي روائح كريهة", "taskIndex": 4}, {"rating": 2, "taskName": "سلة النفايات نظيفة ومبطنة باكياس  والمخلفات غير متراكمة فيها", "taskIndex": 6}, {"rating": 4, "taskName": "أدوات النظافة نظيفة بعد الاستخدام وتحفظ في الأماكن المخصصة", "taskIndex": 9}, {"rating": 3, "taskName": "مستلزمات الوقاية الشخصية متوفرة ومستخدمة", "taskIndex": 8}, {"rating": 1, "taskName": "أدوات النظافة  بحالة جيدة ومناسبة لاعمال التنظيف", "taskIndex": 7}]}]	سلوك	\N	\N	2025-09-11T23:09:11.229Z	2025-09-11T23:09:11.229Z	server	t	1757632151229	\N	f	1	1	\N	2025-09-11 23:09:11.348489	2025-09-11 23:09:11.348489
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.reports (id, type, start_date, end_date, location_ids, generated_by, file_path, created_at) FROM stdin;
\.


--
-- Data for Name: security_logs; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.security_logs (id, event_type, level, user_id, username, ip_address, user_agent, endpoint, details, created_at) FROM stdin;
1	LOGIN_SUCCESS	LOW	43	owner	10.82.9.175	Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.143 Mobile Safari/537.36	\N	{}	2025-09-04 23:22:37.13
2	LOGIN_SUCCESS	LOW	43	owner	10.82.9.175	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 OPR/91.0.0.0	\N	{}	2025-09-04 23:25:01.432
3	LOGIN_SUCCESS	LOW	43	owner	34.170.191.254	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-05 00:09:36.391
4	LOGIN_SUCCESS	LOW	43	owner	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36	\N	{}	2025-09-05 07:55:17.794
5	LOGIN_SUCCESS	LOW	43	owner	104.154.151.15	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 10:40:02.848
6	LOGIN_SUCCESS	LOW	43	owner	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 10:40:20.905
7	LOGIN_SUCCESS	LOW	43	owner	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 10:41:49.299
9	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:15:53.646
10	LOGIN_SUCCESS	LOW	58	Salah	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:16:49.249
11	LOGIN_SUCCESS	LOW	55	galal-alfakeh	34.136.244.224	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:17:35.808
12	LOGIN_SUCCESS	LOW	50	ahmed-aref	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:18:18.945
13	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:19:05.877
14	LOGIN_SUCCESS	LOW	60	sadeq	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:19:53.528
15	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:20:55.281
16	LOGIN_SUCCESS	LOW	60	sadeq	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:21:38.353
17	LOGIN_SUCCESS	LOW	59	marwan	34.136.244.224	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:22:31.422
18	LOGIN_SUCCESS	LOW	51	owner-ycfms	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:23:34.766
19	LOGIN_SUCCESS	LOW	61	owner-ycsr	34.136.244.224	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-06 23:24:44.687
33	LOGIN_SUCCESS	LOW	58	Salah	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36	\N	{}	2025-09-07 04:49:18.454
34	LOGIN_SUCCESS	LOW	43	owner	34.59.60.32	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 04:56:29.16
35	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	34.60.209.83	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 04:57:24.409
37	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 05:03:07.647
38	LOGIN_SUCCESS	LOW	58	Salah	34.59.60.32	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 05:06:08.491
44	LOGIN_SUCCESS	LOW	43	owner	34.30.225.124	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:37:52.939
45	LOGIN_SUCCESS	LOW	58	Salah	34.30.242.206	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:38:22.562
46	LOGIN_SUCCESS	LOW	43	owner	34.30.225.124	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:39:33.119
47	LOGIN_SUCCESS	LOW	54	data_specialist_6	34.30.225.124	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:39:56.124
48	LOGIN_SUCCESS	LOW	54	data_specialist_6	34.60.209.83	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-07 08:41:01.943
49	LOGIN_SUCCESS	LOW	43	owner	104.154.151.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:41:30.674
50	LOGIN_SUCCESS	LOW	58	Salah	34.58.89.73	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:41:39.917
57	LOGIN_SUCCESS	LOW	43	owner	34.30.242.206	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:55:11.867
58	LOGIN_SUCCESS	LOW	58	Salah	34.30.225.124	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:55:35.064
59	LOGIN_SUCCESS	LOW	43	owner	34.133.76.182	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:56:54.998
60	LOGIN_SUCCESS	LOW	58	Salah	34.59.60.32	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 08:57:11.613
62	LOGIN_SUCCESS	LOW	43	owner	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 09:54:32.351
63	LOGIN_SUCCESS	LOW	58	Salah	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 09:54:41.363
66	LOGIN_SUCCESS	LOW	43	owner	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 10:53:51.675
67	LOGIN_SUCCESS	LOW	43	owner	104.154.151.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-07 10:55:32.478
73	LOGIN_SUCCESS	LOW	58	Salah	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36	\N	{}	2025-09-07 19:50:37.029
74	LOGIN_SUCCESS	LOW	58	Salah	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 20:20:49.507
76	LOGIN_SUCCESS	LOW	43	owner	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 20:34:26.424
77	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 20:40:55.7
78	LOGIN_SUCCESS	LOW	43	owner	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 20:41:40.305
79	LOGIN_SUCCESS	LOW	58	Salah	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-07 20:59:58.414
80	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-08 05:41:22.931
84	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.12	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-BFbOKEAA.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:35:11.991
85	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.12	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-DlfZh0fN.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:35:11.995
86	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-BFbOKEAA.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:36:11.617
87	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-DlfZh0fN.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:36:11.619
88	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-BFbOKEAA.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:37:00.051
89	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-DlfZh0fN.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:37:00.064
90	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-DlfZh0fN.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:37:03.468
91	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	/assets/index-BFbOKEAA.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:13751:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 08:37:03.472
99	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-DCIGcbEd.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:02:47.995
100	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-CRd0DHeZ.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:02:48.003
101	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-CRd0DHeZ.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:10.154
102	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-DCIGcbEd.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:10.158
103	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-DCIGcbEd.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:15.123
104	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-CRd0DHeZ.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:15.125
105	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-DCIGcbEd.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:17.028
106	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.8	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-CRd0DHeZ.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14050:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:03:17.03
107	LOGIN_SUCCESS	LOW	43	owner	34.133.76.182	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-08 19:16:07.075
232	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.6.35	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-06 15:53:07.015
108	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.9	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-C3v78CkI.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14099:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:37:56.172
109	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.9	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-CRd0DHeZ.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:14099:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-08 19:37:56.175
115	LOGIN_SUCCESS	LOW	58	Salah	34.30.225.124	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0	\N	{}	2025-09-08 22:20:58.571
116	LOGIN_SUCCESS	LOW	43	owner	34.136.244.224	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-08 22:26:11.102
117	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-09 04:41:11.867
118	LOGIN_SUCCESS	LOW	43	owner	34.30.225.124	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-09 04:46:02.42
150	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0	\N	{}	2025-09-09 21:36:04.897
151	LOGIN_SUCCESS	LOW	43	owner	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-09 21:38:53.69
154	LOGIN_SUCCESS	LOW	58	Salah	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-10 05:39:48.736
155	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.42.110.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:52:09.971
156	LOGIN_SUCCESS	LOW	43	owner	34.30.242.206	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:52:14.626
157	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.133.76.182	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:52:47.646
158	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.60.209.83	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:53:03.513
159	LOGIN_SUCCESS	LOW	43	owner	34.133.76.182	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:53:42.505
160	LOGIN_SUCCESS	LOW	43	owner	34.42.110.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 05:53:47.552
161	LOGIN_SUCCESS	LOW	43	owner	34.59.60.32	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-10 05:55:06.663
162	LOGIN_SUCCESS	LOW	43	owner	104.154.151.15	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-10 05:55:25.97
164	LOGIN_SUCCESS	LOW	58	Salah	34.133.76.182	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 08:08:55.47
165	LOGIN_SUCCESS	LOW	58	Salah	104.154.151.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	\N	{}	2025-09-10 08:08:59.726
179	LOGIN_SUCCESS	LOW	43	owner	34.58.89.73	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-11 05:11:18.724
180	LOGIN_SUCCESS	LOW	43	owner	34.30.242.206	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-11 05:17:57.393
181	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.30.242.206	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36	\N	{}	2025-09-11 10:17:48.954
182	LOGIN_SUCCESS	LOW	43	owner	34.136.244.224	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 10:20:51.96
183	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36	\N	{}	2025-09-11 10:21:29.365
184	LOGIN_SUCCESS	LOW	43	owner	34.42.110.3	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 10:41:49.622
186	LOGIN_SUCCESS	LOW	43	owner	34.60.209.83	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 16:37:18.178
187	LOGIN_SUCCESS	LOW	58	Salah	34.59.60.32	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 16:38:10.085
188	LOGIN_SUCCESS	LOW	58	Salah	34.59.60.32	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 16:38:15.151
189	LOGIN_SUCCESS	LOW	43	owner	10.82.7.180	Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.158 Mobile Safari/537.36	\N	{}	2025-09-11 16:57:27.508
190	LOGIN_SUCCESS	LOW	43	owner	34.58.89.73	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 16:57:59.278
191	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.12	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-jarVyp7m.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:15271:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-11 17:52:09.739
192	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.12	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	/assets/index-BGjPRiKB.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:15271:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-09-11 17:52:09.742
193	LOGIN_SUCCESS	LOW	43	owner	10.82.3.250	Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.158 Mobile Safari/537.36	\N	{}	2025-09-11 18:13:17.767
194	LOGIN_SUCCESS	LOW	44	ali-ahdal	34.42.110.3	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-11 18:14:16.788
196	LOGIN_SUCCESS	LOW	44	ali-ahdal	104.154.151.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-11 19:41:47.283
198	LOGIN_SUCCESS	LOW	43	owner	10.82.6.211	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 EdgA/139.0.0.0	\N	{}	2025-09-12 07:28:51.871
199	LOGIN_SUCCESS	LOW	43	owner	10.82.2.162	Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.51 Mobile Safari/537.36	\N	{}	2025-09-12 14:30:14.708
200	LOGIN_SUCCESS	LOW	43	owner	10.82.11.46	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:42:53.8
201	LOGIN_SUCCESS	LOW	44	ali-ahdal	10.82.6.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:43:46.472
202	LOGIN_SUCCESS	LOW	44	ali-ahdal	10.82.1.39	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:43:55.844
203	LOGIN_SUCCESS	LOW	43	owner	10.82.5.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:45:08.213
204	LOGIN_SUCCESS	LOW	43	owner	10.82.5.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:45:29.482
205	LOGIN_SUCCESS	LOW	64	gamal-hareth	10.82.5.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:46:59.549
206	LOGIN_SUCCESS	LOW	64	gamal-hareth	10.82.11.46	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:48:01.702
207	LOGIN_SUCCESS	LOW	44	ali-ahdal	10.82.7.5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:48:15.927
208	LOGIN_SUCCESS	LOW	44	ali-ahdal	10.82.10.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:48:24.85
209	LOGIN_SUCCESS	LOW	64	gamal-hareth	10.82.10.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:49:13.749
210	LOGIN_SUCCESS	LOW	64	gamal-hareth	10.82.6.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:49:30.238
211	LOGIN_SUCCESS	LOW	43	owner	10.82.11.46	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:50:03.192
212	LOGIN_SUCCESS	LOW	43	owner	10.82.10.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-15 05:50:11.273
213	LOGIN_SUCCESS	LOW	43	owner	10.82.2.199	Mozilla/5.0 (Linux; Android 15; SM-S918B Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.51 Mobile Safari/537.36	\N	{}	2025-09-24 09:44:48.541
214	LOGIN_SUCCESS	LOW	43	owner	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-29 06:42:41.149
215	LOGIN_SUCCESS	LOW	43	owner	10.82.1.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-29 08:09:08.467
216	LOGIN_SUCCESS	LOW	43	owner	10.82.7.30	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	{}	2025-09-29 08:53:14.527
217	LOGIN_SUCCESS	LOW	43	owner	10.82.2.27	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-06 14:34:00.363
218	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-CJ8jBUpD.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:11:55.086
233	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.2.27	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-06 15:54:09.537
219	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-BmHFSLk5.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:11:55.089
220	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.5	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 (compatible; Google-Read-Aloud; +https://support.google.com/webmasters/answer/1061943)	/assets/index-BmHFSLk5.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:00.557
221	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 (compatible; Google-Read-Aloud; +https://support.google.com/webmasters/answer/1061943)	/assets/index-CJ8jBUpD.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:00.651
222	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.5	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 (compatible; Google-Read-Aloud; +https://support.google.com/webmasters/answer/1061943)	/assets/index-CJ8jBUpD.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:00.741
223	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-CJ8jBUpD.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:37.054
224	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-BmHFSLk5.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:37.078
225	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-CJ8jBUpD.css	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:38.671
226	SUSPICIOUS_ACTIVITY	MEDIUM	\N	\N	10.82.160.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	/assets/index-BmHFSLk5.js	{"stack": "Error: Not allowed by CORS\\n    at origin (file:///home/runner/workspace/dist/index.js:16443:14)\\n    at /home/runner/workspace/node_modules/cors/lib/index.js:219:13\\n    at optionsCallback (/home/runner/workspace/node_modules/cors/lib/index.js:199:9)\\n    at corsMiddleware (/home/runner/workspace/node_modules/cors/lib/index.js:204:7)\\n    at Layer.handle [as handle_request] (/home/runner/workspace/node_modules/express/lib/router/layer.js:95:5)\\n    at trim_prefix (/home/runner/workspace/node_modules/", "errorName": "Error", "errorMessage": "Not allowed by CORS"}	2025-10-06 15:12:38.674
227	LOGIN_SUCCESS	LOW	43	owner	10.82.6.28	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-06 15:13:42.189
228	LOGIN_SUCCESS	LOW	43	owner	10.82.1.15	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-06 15:26:03.64
229	LOGIN_SUCCESS	LOW	43	owner	10.82.7.217	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 15:49:23.396
230	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.10.106	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 15:51:40.726
231	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.1.15	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 15:51:51.939
234	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.1.15	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 16:05:32.764
235	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.1.15	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 16:06:38.564
236	LOGIN_SUCCESS	LOW	43	owner	10.82.11.214	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 16:18:47.708
237	LOGIN_SUCCESS	LOW	43	owner	10.82.11.214	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-06 16:18:56.145
238	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.8.104	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 09:30:47.768
239	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 09:31:46.46
240	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 09:34:49.866
241	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.11.214	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 09:34:58.067
242	LOGIN_SUCCESS	LOW	43	owner	10.82.3.143	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:32:22.404
243	LOGIN_SUCCESS	LOW	43	owner	10.82.3.143	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:32:31.321
244	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.8.104	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:32:41.192
245	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.1.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:32:49.157
246	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.5.38	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:47:52.603
247	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:52:47.512
248	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.11.214	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:53:07.72
249	LOGIN_SUCCESS	LOW	67	owner-ycd	10.82.7.243	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:56:25.504
250	LOGIN_SUCCESS	LOW	67	owner-ycd	10.82.7.243	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 12:56:34.4
251	LOGIN_SUCCESS	LOW	67	owner-ycd	10.82.1.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:02:29.122
252	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:02:40.805
253	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.7.243	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:02:50.945
254	LOGIN_SUCCESS	LOW	43	owner	10.82.1.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:08:16.212
255	LOGIN_SUCCESS	LOW	43	owner	10.82.11.214	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:08:24.546
256	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.10.106	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:09:15.36
257	LOGIN_SUCCESS	LOW	65	owner-yiic	10.82.5.38	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:09:23.752
258	LOGIN_SUCCESS	LOW	67	owner-ycd	10.82.1.15	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:13:02.604
259	LOGIN_SUCCESS	LOW	67	owner-ycd	10.82.11.214	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-07 13:13:10.996
260	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.11.214	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-07 16:14:40.016
261	LOGIN_SUCCESS	LOW	43	owner	10.82.7.243	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-07 16:35:38.701
262	LOGIN_SUCCESS	LOW	43	owner	10.82.6.97	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-07 16:35:50.677
263	LOGIN_SUCCESS	LOW	43	owner	10.82.5.38	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-07 16:46:32.455
264	LOGIN_SUCCESS	LOW	43	owner	10.82.8.104	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36	\N	{}	2025-10-07 16:47:25.5
265	LOGIN_SUCCESS	LOW	43	owner	10.82.6.97	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-07 16:49:55.127
266	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.6.97	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-07 17:14:21.058
267	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.3.143	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-07 17:15:04.042
268	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.7.243	Mozilla/5.0 (Linux; Android 16; SM-S918B Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36	\N	{}	2025-10-07 17:53:15.185
269	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.6.97	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-08 04:18:49.072
270	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.11.214	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-08 04:19:10.908
271	LOGIN_SUCCESS	LOW	33	general_manager_enhanced	10.82.8.104	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0	\N	{}	2025-10-08 05:12:03.182
\.


--
-- Data for Name: supervisor_assessment_location_permissions; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.supervisor_assessment_location_permissions (id, supervisor_id, location_id, company_id, is_enabled, created_at, updated_at) FROM stdin;
10	44	512	6	f	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
11	44	523	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
12	44	524	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
13	44	525	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
14	44	527	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
15	44	528	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
16	44	529	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
17	44	526	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
18	44	530	6	t	2025-08-14 08:21:27.442848	2025-08-14 08:21:27.442848
\.


--
-- Data for Name: supervisor_user_location_permissions; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.supervisor_user_location_permissions (id, supervisor_id, user_id, location_id, granted_by, created_at, is_enabled) FROM stdin;
116	44	55	523	44	2025-08-22 09:19:43.006878	f
117	44	55	524	44	2025-08-22 09:19:43.006878	t
118	44	55	525	44	2025-08-22 09:19:43.006878	f
119	44	55	526	44	2025-08-22 09:19:43.006878	f
120	44	55	530	44	2025-08-22 09:19:43.006878	f
121	44	55	527	44	2025-08-22 09:19:43.006878	t
122	44	55	529	44	2025-08-22 09:19:43.006878	f
123	44	55	528	44	2025-08-22 09:19:43.006878	f
124	44	55	534	44	2025-08-22 09:19:43.006878	t
125	44	55	535	44	2025-08-22 09:19:43.006878	f
126	44	55	536	44	2025-08-22 09:19:43.006878	f
127	44	58	523	44	2025-08-22 09:24:36.091447	t
128	44	58	524	44	2025-08-22 09:24:36.091447	t
129	44	58	525	44	2025-08-22 09:24:36.091447	f
130	44	58	526	44	2025-08-22 09:24:36.091447	f
131	44	58	530	44	2025-08-22 09:24:36.091447	f
132	44	58	527	44	2025-08-22 09:24:36.091447	f
133	44	58	529	44	2025-08-22 09:24:36.091447	t
134	44	58	528	44	2025-08-22 09:24:36.091447	f
135	44	58	534	44	2025-08-22 09:24:36.091447	t
136	44	58	535	44	2025-08-22 09:24:36.091447	t
137	44	58	536	44	2025-08-22 09:24:36.091447	f
138	44	50	523	44	2025-08-22 09:24:46.681799	t
139	44	50	524	44	2025-08-22 09:24:46.681799	f
140	44	50	525	44	2025-08-22 09:24:46.681799	t
141	44	50	526	44	2025-08-22 09:24:46.681799	t
142	44	50	530	44	2025-08-22 09:24:46.681799	t
143	44	50	527	44	2025-08-22 09:24:46.681799	f
144	44	50	529	44	2025-08-22 09:24:46.681799	t
145	44	50	528	44	2025-08-22 09:24:46.681799	t
146	44	50	534	44	2025-08-22 09:24:46.681799	t
147	44	50	535	44	2025-08-22 09:24:46.681799	t
148	44	50	536	44	2025-08-22 09:24:46.681799	f
209	43	50	523	43	2025-08-25 16:56:21.185236	f
210	43	50	524	43	2025-08-25 16:56:21.185236	t
211	43	50	526	43	2025-08-25 16:56:21.185236	t
212	43	50	530	43	2025-08-25 16:56:21.185236	t
213	43	50	527	43	2025-08-25 16:56:21.185236	t
214	43	50	529	43	2025-08-25 16:56:21.185236	t
215	43	50	528	43	2025-08-25 16:56:21.185236	t
216	43	50	534	43	2025-08-25 16:56:21.185236	t
217	43	50	525	43	2025-08-25 16:56:21.185236	t
218	43	50	535	43	2025-08-25 16:56:21.185236	t
219	44	64	523	44	2025-09-15 05:48:39.553892	t
220	44	64	524	44	2025-09-15 05:48:39.553892	t
221	44	64	526	44	2025-09-15 05:48:39.553892	t
222	44	64	530	44	2025-09-15 05:48:39.553892	t
223	44	64	527	44	2025-09-15 05:48:39.553892	t
224	44	64	529	44	2025-09-15 05:48:39.553892	t
225	44	64	528	44	2025-09-15 05:48:39.553892	t
226	44	64	534	44	2025-09-15 05:48:39.553892	t
227	44	64	525	44	2025-09-15 05:48:39.553892	t
228	44	64	535	44	2025-09-15 05:48:39.553892	t
229	44	64	568	44	2025-09-15 05:48:39.553892	t
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.system_settings (id, user_id, company_id, category, setting_key, setting_value, description, is_user_specific, is_company_specific, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: unified_evaluations; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.unified_evaluations (id, evaluation_id, location_id, location_name_ar, location_name_en, evaluator_id, evaluator_name, company_id, company_name_ar, company_name_en, evaluation_timestamp, evaluation_date, evaluation_time, evaluation_items, general_notes, overall_rating, is_synced, sync_timestamp, source, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_dashboard_settings; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.user_dashboard_settings (id, user_id, dashboard_config, created_at, updated_at) FROM stdin;
1	43	{"sections": ["locations", "users", "reports", "kpi-dashboard", "system-settings"]}	2025-08-25 05:44:28.638	2025-08-25 05:44:28.638
2	62	{"dashboard": {"enabled": true}}	2025-08-31 06:39:31.334044	2025-08-31 06:39:31.334044
3	62	{"locations": {"enabled": true}}	2025-08-31 06:39:31.382951	2025-08-31 06:39:31.382951
4	62	{"checklists": {"enabled": true}}	2025-08-31 06:39:31.427585	2025-08-31 06:39:31.427585
5	62	{"evaluations": {"enabled": false}}	2025-08-31 06:39:31.472558	2025-08-31 06:39:31.472558
6	62	{"reports": {"enabled": false}}	2025-08-31 06:39:31.517033	2025-08-31 06:39:31.517033
7	62	{"users": {"enabled": false}}	2025-08-31 06:39:31.561459	2025-08-31 06:39:31.561459
8	62	{"settings": {"enabled": true}}	2025-08-31 06:39:31.606689	2025-08-31 06:39:31.606689
9	62	{"sync": {"enabled": true}}	2025-08-31 06:39:31.651096	2025-08-31 06:39:31.651096
10	62	{"analytics": {"enabled": false}}	2025-08-31 06:39:31.695933	2025-08-31 06:39:31.695933
11	66	{"dashboard": {"enabled": true}}	2025-10-07 09:34:00.635603	2025-10-07 09:34:00.635603
12	66	{"locations": {"enabled": true}}	2025-10-07 09:34:00.659202	2025-10-07 09:34:00.659202
13	66	{"checklists": {"enabled": true}}	2025-10-07 09:34:00.676928	2025-10-07 09:34:00.676928
14	66	{"evaluations": {"enabled": false}}	2025-10-07 09:34:00.695328	2025-10-07 09:34:00.695328
15	66	{"reports": {"enabled": false}}	2025-10-07 09:34:00.713488	2025-10-07 09:34:00.713488
16	66	{"users": {"enabled": false}}	2025-10-07 09:34:00.731393	2025-10-07 09:34:00.731393
17	66	{"settings": {"enabled": true}}	2025-10-07 09:34:00.749815	2025-10-07 09:34:00.749815
18	66	{"sync": {"enabled": true}}	2025-10-07 09:34:00.767777	2025-10-07 09:34:00.767777
19	66	{"analytics": {"enabled": false}}	2025-10-07 09:34:00.785845	2025-10-07 09:34:00.785845
20	68	{"dashboard": {"enabled": true}}	2025-10-07 12:55:39.396061	2025-10-07 12:55:39.396061
21	68	{"locations": {"enabled": true}}	2025-10-07 12:55:39.420445	2025-10-07 12:55:39.420445
22	68	{"checklists": {"enabled": true}}	2025-10-07 12:55:39.439166	2025-10-07 12:55:39.439166
23	68	{"evaluations": {"enabled": false}}	2025-10-07 12:55:39.457634	2025-10-07 12:55:39.457634
24	68	{"reports": {"enabled": false}}	2025-10-07 12:55:39.476096	2025-10-07 12:55:39.476096
25	68	{"users": {"enabled": false}}	2025-10-07 12:55:39.494823	2025-10-07 12:55:39.494823
26	68	{"settings": {"enabled": true}}	2025-10-07 12:55:39.513769	2025-10-07 12:55:39.513769
27	68	{"sync": {"enabled": true}}	2025-10-07 12:55:39.531395	2025-10-07 12:55:39.531395
28	68	{"analytics": {"enabled": false}}	2025-10-07 12:55:39.550344	2025-10-07 12:55:39.550344
29	70	{"dashboard": {"enabled": true}}	2025-10-08 05:13:04.281053	2025-10-08 05:13:04.281053
30	70	{"locations": {"enabled": true}}	2025-10-08 05:13:04.301366	2025-10-08 05:13:04.301366
31	70	{"checklists": {"enabled": true}}	2025-10-08 05:13:04.318545	2025-10-08 05:13:04.318545
32	70	{"evaluations": {"enabled": false}}	2025-10-08 05:13:04.336095	2025-10-08 05:13:04.336095
33	70	{"reports": {"enabled": false}}	2025-10-08 05:13:04.353348	2025-10-08 05:13:04.353348
34	70	{"users": {"enabled": false}}	2025-10-08 05:13:04.370631	2025-10-08 05:13:04.370631
35	70	{"settings": {"enabled": true}}	2025-10-08 05:13:04.388459	2025-10-08 05:13:04.388459
36	70	{"sync": {"enabled": true}}	2025-10-08 05:13:04.40556	2025-10-08 05:13:04.40556
37	70	{"analytics": {"enabled": false}}	2025-10-08 05:13:04.423389	2025-10-08 05:13:04.423389
\.


--
-- Data for Name: user_location_permissions; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.user_location_permissions (id, user_id, location_id, created_at) FROM stdin;
1	55	512	2025-08-14 08:21:08.08795
2	55	523	2025-08-14 08:21:08.08795
3	55	524	2025-08-14 08:21:08.08795
4	55	525	2025-08-14 08:21:08.08795
5	55	527	2025-08-14 08:21:08.08795
6	55	528	2025-08-14 08:21:08.08795
7	55	529	2025-08-14 08:21:08.08795
8	55	526	2025-08-14 08:21:08.08795
9	55	530	2025-08-14 08:21:08.08795
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: production; Owner: -
--

COPY production.users (id, username, password, full_name, role, is_active, created_at, last_login_at, company_id, created_by, can_manage_users) FROM stdin;
62	data_specialist_9	$2b$10$i3I5b7VyrgYoUSVZm6Cbe.dAUsM8EkdJqzz6W24ukXcYwhuoI72CS	اخصائي بيانات الشركة	data_specialist	t	2025-08-31 06:39:30.901161	2025-09-03 12:23:06.618	9	33	f
63	test	$2b$12$R6f/K9cntyMzfjR6TCM6tuSjX5U2FBN0XrKBtYIGY204xafpKyZ/O	مستخدم تجريبي	admin	t	2025-08-31 09:11:14.723972	2025-08-31 09:13:17.708	1	\N	t
52	data_specialist_7	$2b$10$HXpnkGOgF/MhIRvzqwLVsOF93z8w26sAri7PtWBrIXbXFSIrlq1Va	اخصائي بيانات الشركة	data_specialist	t	2025-08-13 08:52:13.480466	2025-09-01 13:36:49.767	7	33	f
64	gamal-hareth	$2b$10$MHJYV7HsGGBYaFXntjZuMO9v6Xt8yzbvhw4MAbFziwgCjh9hMjSQy	gamal	user	t	2025-09-15 05:40:56.036782	2025-09-15 05:49:30.206	6	\N	f
55	galal-alfakeh	$2b$10$FQL9n1jJa6sT0x.TbJN/Q.pitSWLjck34hk5DcGgnThSSd8YWeIji	جلال الفقيه	user	t	2025-08-13 15:01:12.492662	2025-09-06 23:17:35.762	6	\N	f
50	ahmed-aref	$2b$10$jHbNqRtEh4fcOhXt8jtoEOIG5jHx6KZZB7tt8TBXuecDGwkbxcd7e	احمد عارف	user	t	2025-08-13 08:38:40.094433	2025-09-06 23:18:18.881	6	\N	f
43	owner	$2b$10$QZ5nbpI1m1Swzj9lrFJeUegPm2sDUaC1prQI4qCQW4Jvr/1V00/My	مدير الشؤون الادارية	admin	t	2025-08-10 09:54:10.579545	2025-10-07 16:49:55.081	6	33	t
60	sadeq	$2b$10$g83XL2Q6bxrZn5TkVsYMO.y.F6QZMN3jrCaeJBt9HW5INaanXe.Oi	sadeq	analytics_viewer	t	2025-08-14 15:15:35.579784	2025-09-06 23:21:38.307	1	\N	f
59	marwan	$2b$10$r/ZGYKw.L8JgqzY7a5MI6OwXRO6S8k6LGgfX81865i7Vo8/Y8SIbe	marwan	analytics_viewer	t	2025-08-14 14:57:40.856098	2025-09-06 23:22:31.375	1	\N	f
51	owner-ycfms	$2b$10$nhUACoJSthIFUQuw9G3vae1Wb4nGgHYOvC5bXrO.cUZetyPt1dHHm	مدير الشؤون الادارية	admin	t	2025-08-13 08:52:13.401575	2025-09-06 23:23:34.708	7	33	t
61	owner-ycsr	$2b$10$Mirvy3T..9CkgMaHW4W/8OdKqO8Tx8P5xJK89HRFUTcvc4Q.RPYRK	مدير الشؤون الادارية	admin	t	2025-08-31 06:39:30.783681	2025-09-06 23:24:44.641	9	33	t
58	Salah	$2b$10$WCQYntTTlHrpNrdo760w5eP3SAWaF7kbel.vWp4M9oyx1/7e5kzWO	Salah	user	t	2025-08-14 13:50:29.614231	2025-09-11 16:38:15.045	6	\N	f
68	data_specialist_11	$2b$10$m.UgETnv7UPI7.XCQMJ64Ov2VlgrA2muO56ibUSIJx.S7Yk0ka3Pm	اخصائي بيانات الشركة	data_specialist	t	2025-10-07 12:55:39.202948	\N	11	33	f
33	general_manager_enhanced	$2b$10$tCOUpDRu6UNSnseiR0A.J.uoQl.Da2ldlFJNeyBDD6SOXBNf9lHqW	مدير بيئة العمل	enhanced_general_manager	t	2025-08-09 16:48:19.570609	2025-10-08 05:12:03.102	1	\N	f
69	shawqi	$2b$10$9T.KwSSdgIQIpcItd7T20eWMjbHz.PVSxe.eW0MNnjCeaGiihcrJa	مدير الشؤون الادارية	admin	t	2025-10-08 05:13:04.028639	\N	12	33	t
54	data_specialist_6	$2b$10$RxKoUICjqrkEpyrrJbFLhu41hCsPHOagf8NLf1MvoqndneOZTZJ82	اخصائي بيانات الشركة	data_specialist	t	2025-08-13 11:39:55.535938	2025-09-07 08:41:01.895	6	33	f
70	data_specialist_12	$2b$10$u7GkKKxikVEi2jpzGzxrs.oiS./r1BbKoD8MWO3N1I71WlGCXUWaS	اخصائي بيانات الشركة	data_specialist	t	2025-10-08 05:13:04.113658	\N	12	33	f
65	owner-yiic	$2b$10$3utX6uCLHMxnXtRPDMJ8uukOYxqsl2bt2JrXEuFK147gcOs5tztsW	مدير الشؤون الادارية	admin	t	2025-10-07 09:34:00.368129	2025-10-07 13:09:23.716	10	33	t
67	owner-ycd	$2b$10$llZ59rAuuw/4r7xIxxAKXuN7YJioMAExpeCJegxmlYSSw9e7kuRTi	مدير الشؤون الادارية	admin	t	2025-10-07 12:55:39.121928	2025-10-07 13:13:10.952	11	33	t
66	data_specialist_10	$2b$10$mSMMJndjKlfAxp63efvsseB8r6tOWfiD2Z50.GAFFY5t34uhWo0am	اخصائي بيانات الشركة	data_specialist	t	2025-10-07 09:34:00.453134	\N	10	33	f
44	ali-ahdal	$2b$10$iMXXtzYoipyR05Vw0dwWjO7eyswaF0q7dOSozUHeQpJtDgLDSqd.W	علي الاهدل	supervisor	t	2025-08-10 10:20:09.104191	2025-09-15 05:48:24.816	6	\N	f
\.


--
-- Name: category_comments category_comments_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.category_comments
    ADD CONSTRAINT category_comments_pkey PRIMARY KEY (id);


--
-- Name: checklist_templates checklist_templates_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.checklist_templates
    ADD CONSTRAINT checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: daily_checklists daily_checklists_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.daily_checklists
    ADD CONSTRAINT daily_checklists_pkey PRIMARY KEY (id);


--
-- Name: dashboard_settings dashboard_settings_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.dashboard_settings
    ADD CONSTRAINT dashboard_settings_pkey PRIMARY KEY (id);


--
-- Name: kpi_access kpi_access_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.kpi_access
    ADD CONSTRAINT kpi_access_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: master_evaluations master_evaluations_evaluation_id_key; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.master_evaluations
    ADD CONSTRAINT master_evaluations_evaluation_id_key UNIQUE (evaluation_id);


--
-- Name: master_evaluations master_evaluations_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.master_evaluations
    ADD CONSTRAINT master_evaluations_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: supervisor_assessment_location_permissions supervisor_assessment_location_permissions_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.supervisor_assessment_location_permissions
    ADD CONSTRAINT supervisor_assessment_location_permissions_pkey PRIMARY KEY (id);


--
-- Name: supervisor_user_location_permissions supervisor_user_location_permissions_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.supervisor_user_location_permissions
    ADD CONSTRAINT supervisor_user_location_permissions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: unified_evaluations unified_evaluations_evaluation_id_key; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.unified_evaluations
    ADD CONSTRAINT unified_evaluations_evaluation_id_key UNIQUE (evaluation_id);


--
-- Name: unified_evaluations unified_evaluations_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.unified_evaluations
    ADD CONSTRAINT unified_evaluations_pkey PRIMARY KEY (id);


--
-- Name: user_dashboard_settings user_dashboard_settings_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.user_dashboard_settings
    ADD CONSTRAINT user_dashboard_settings_pkey PRIMARY KEY (id);


--
-- Name: user_location_permissions user_location_permissions_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.user_location_permissions
    ADD CONSTRAINT user_location_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: production; Owner: -
--

ALTER TABLE ONLY production.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_security_logs_created_at; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX idx_security_logs_created_at ON production.security_logs USING btree (created_at);


--
-- Name: idx_security_logs_event_type; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX idx_security_logs_event_type ON production.security_logs USING btree (event_type);


--
-- Name: idx_security_logs_ip_address; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX idx_security_logs_ip_address ON production.security_logs USING btree (ip_address);


--
-- Name: idx_security_logs_level; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX idx_security_logs_level ON production.security_logs USING btree (level);


--
-- Name: idx_security_logs_user_id; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX idx_security_logs_user_id ON production.security_logs USING btree (user_id);


--
-- Name: security_logs_created_at_idx; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX security_logs_created_at_idx ON production.security_logs USING btree (created_at);


--
-- Name: security_logs_event_type_idx; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX security_logs_event_type_idx ON production.security_logs USING btree (event_type);


--
-- Name: security_logs_ip_address_idx; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX security_logs_ip_address_idx ON production.security_logs USING btree (ip_address);


--
-- Name: security_logs_level_idx; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX security_logs_level_idx ON production.security_logs USING btree (level);


--
-- Name: security_logs_user_id_idx; Type: INDEX; Schema: production; Owner: -
--

CREATE INDEX security_logs_user_id_idx ON production.security_logs USING btree (user_id);


--
-- PostgreSQL database dump complete
--

