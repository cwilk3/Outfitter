--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'deposit_paid',
    'paid',
    'completed',
    'cancelled'
);


ALTER TYPE public.booking_status OWNER TO neondb_owner;

--
-- Name: category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.category AS ENUM (
    'deer_hunting',
    'duck_hunting',
    'elk_hunting',
    'pheasant_hunting',
    'bass_fishing',
    'trout_fishing',
    'other_hunting',
    'other_fishing'
);


ALTER TYPE public.category OWNER TO neondb_owner;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE public.payment_status OWNER TO neondb_owner;

--
-- Name: role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.role AS ENUM (
    'admin',
    'guide'
);


ALTER TYPE public.role OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    user_id character varying,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO neondb_owner;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO neondb_owner;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: addon_inventory_dates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.addon_inventory_dates (
    id integer NOT NULL,
    addon_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    used_inventory integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.addon_inventory_dates OWNER TO neondb_owner;

--
-- Name: addon_inventory_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.addon_inventory_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addon_inventory_dates_id_seq OWNER TO neondb_owner;

--
-- Name: addon_inventory_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.addon_inventory_dates_id_seq OWNED BY public.addon_inventory_dates.id;


--
-- Name: booking_guides; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.booking_guides (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    guide_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.booking_guides OWNER TO neondb_owner;

--
-- Name: booking_guides_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.booking_guides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_guides_id_seq OWNER TO neondb_owner;

--
-- Name: booking_guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.booking_guides_id_seq OWNED BY public.booking_guides.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    booking_number text NOT NULL,
    experience_id integer NOT NULL,
    customer_id integer NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    group_size integer DEFAULT 1 NOT NULL,
    notes text,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bookings OWNER TO neondb_owner;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO neondb_owner;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    city text,
    state text,
    zip text,
    notes text,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO neondb_owner;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    name text NOT NULL,
    path text NOT NULL,
    type text NOT NULL,
    size integer NOT NULL,
    booking_id integer,
    customer_id integer,
    guide_id character varying,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: experience_addons; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.experience_addons (
    id integer NOT NULL,
    experience_id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    is_optional boolean DEFAULT true NOT NULL,
    inventory integer DEFAULT 0,
    max_per_booking integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.experience_addons OWNER TO neondb_owner;

--
-- Name: experience_addons_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.experience_addons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experience_addons_id_seq OWNER TO neondb_owner;

--
-- Name: experience_addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.experience_addons_id_seq OWNED BY public.experience_addons.id;


--
-- Name: experience_guides; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.experience_guides (
    id integer NOT NULL,
    experience_id integer NOT NULL,
    guide_id character varying NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.experience_guides OWNER TO neondb_owner;

--
-- Name: experience_guides_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.experience_guides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experience_guides_id_seq OWNER TO neondb_owner;

--
-- Name: experience_guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.experience_guides_id_seq OWNED BY public.experience_guides.id;


--
-- Name: experience_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.experience_locations (
    id integer NOT NULL,
    experience_id integer NOT NULL,
    location_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.experience_locations OWNER TO neondb_owner;

--
-- Name: experience_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.experience_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experience_locations_id_seq OWNER TO neondb_owner;

--
-- Name: experience_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.experience_locations_id_seq OWNED BY public.experience_locations.id;


--
-- Name: experiences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.experiences (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    duration integer NOT NULL,
    price numeric(10,2) NOT NULL,
    capacity integer NOT NULL,
    location_id integer NOT NULL,
    category public.category DEFAULT 'other_hunting'::public.category,
    images jsonb DEFAULT '[]'::jsonb,
    available_dates jsonb DEFAULT '[]'::jsonb,
    rules jsonb DEFAULT '[]'::jsonb,
    amenities jsonb DEFAULT '[]'::jsonb,
    trip_includes jsonb DEFAULT '[]'::jsonb,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.experiences OWNER TO neondb_owner;

--
-- Name: experiences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.experiences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experiences_id_seq OWNER TO neondb_owner;

--
-- Name: experiences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.experiences_id_seq OWNED BY public.experiences.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    name text NOT NULL,
    address text,
    city text NOT NULL,
    state text NOT NULL,
    zip text,
    description text,
    images jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    outfitter_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.locations OWNER TO neondb_owner;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO neondb_owner;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: outfitters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.outfitters (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    state character varying(50),
    zip character varying(20),
    website character varying(255),
    logo character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.outfitters OWNER TO neondb_owner;

--
-- Name: outfitters_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.outfitters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outfitters_id_seq OWNER TO neondb_owner;

--
-- Name: outfitters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.outfitters_id_seq OWNED BY public.outfitters.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    payment_method text,
    transaction_id text,
    qb_invoice_id text,
    outfitter_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    company_name text NOT NULL,
    company_address text,
    company_phone text,
    company_email text,
    company_logo text,
    qb_client_id text,
    qb_client_secret text,
    qb_refresh_token text,
    qb_realm_id text,
    booking_link text,
    outfitter_id integer,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO neondb_owner;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO neondb_owner;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: user_outfitters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_outfitters (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    outfitter_id integer NOT NULL,
    role public.role DEFAULT 'guide'::public.role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_outfitters OWNER TO neondb_owner;

--
-- Name: user_outfitters_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_outfitters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_outfitters_id_seq OWNER TO neondb_owner;

--
-- Name: user_outfitters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_outfitters_id_seq OWNED BY public.user_outfitters.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    phone text,
    profile_image_url character varying,
    role public.role DEFAULT 'guide'::public.role NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password_hash character varying NOT NULL,
    outfitter_id integer
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: addon_inventory_dates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addon_inventory_dates ALTER COLUMN id SET DEFAULT nextval('public.addon_inventory_dates_id_seq'::regclass);


--
-- Name: booking_guides id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.booking_guides ALTER COLUMN id SET DEFAULT nextval('public.booking_guides_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: experience_addons id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_addons ALTER COLUMN id SET DEFAULT nextval('public.experience_addons_id_seq'::regclass);


--
-- Name: experience_guides id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_guides ALTER COLUMN id SET DEFAULT nextval('public.experience_guides_id_seq'::regclass);


--
-- Name: experience_locations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_locations ALTER COLUMN id SET DEFAULT nextval('public.experience_locations_id_seq'::regclass);


--
-- Name: experiences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experiences ALTER COLUMN id SET DEFAULT nextval('public.experiences_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: outfitters id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.outfitters ALTER COLUMN id SET DEFAULT nextval('public.outfitters_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: user_outfitters id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_outfitters ALTER COLUMN id SET DEFAULT nextval('public.user_outfitters_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.activities (id, action, details, user_id, outfitter_id, created_at) FROM stdin;
\.


--
-- Data for Name: addon_inventory_dates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.addon_inventory_dates (id, addon_id, date, used_inventory, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: booking_guides; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.booking_guides (id, booking_id, guide_id, created_at) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bookings (id, booking_number, experience_id, customer_id, start_date, end_date, status, total_amount, group_size, notes, outfitter_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, first_name, last_name, email, phone, address, city, state, zip, notes, outfitter_id, created_at, updated_at) FROM stdin;
1	Cole	Balser	crwhattrick03@gmail.com	9033884533	1026 N Winnetka Ave	Dallas	TX	75208	New hunter	\N	2025-05-24 23:48:48.848739	2025-05-24 23:48:48.848739
2	Cole	Wilkins	crwhattrick03@gmail.com	9033884533	1026 N Winnetka Ave	Dallas	TX	75208		1	2025-05-25 00:00:07.030444	2025-05-25 00:00:07.030444
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, name, path, type, size, booking_id, customer_id, guide_id, outfitter_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: experience_addons; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.experience_addons (id, experience_id, name, description, price, is_optional, inventory, max_per_booking, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: experience_guides; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.experience_guides (id, experience_id, guide_id, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: experience_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.experience_locations (id, experience_id, location_id, created_at) FROM stdin;
\.


--
-- Data for Name: experiences; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.experiences (id, name, description, duration, price, capacity, location_id, category, images, available_dates, rules, amenities, trip_includes, outfitter_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.locations (id, name, address, city, state, zip, description, images, is_active, outfitter_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: outfitters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.outfitters (id, name, description, email, phone, address, city, state, zip, website, logo, is_active, created_at, updated_at) FROM stdin;
1	Outfitter	\N	crwhattrick03@gmail.com	\N	\N	\N	\N	\N	\N	\N	t	2025-05-23 19:11:04.049341	2025-05-23 19:11:04.049341
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.payments (id, booking_id, amount, status, payment_method, transaction_id, qb_invoice_id, outfitter_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings (id, company_name, company_address, company_phone, company_email, company_logo, qb_client_id, qb_client_secret, qb_refresh_token, qb_realm_id, booking_link, outfitter_id, updated_at) FROM stdin;
1	Final Test Company	123 Main St	555-TEST	final@example.com	\N	\N	\N	\N	\N	\N	\N	2025-05-25 05:19:53.907
\.


--
-- Data for Name: user_outfitters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_outfitters (id, user_id, outfitter_id, role, is_active, created_at, updated_at) FROM stdin;
1	zddwhpv725	1	admin	t	2025-05-23 19:11:04.093448	2025-05-23 19:11:04.093448
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, phone, profile_image_url, role, created_at, updated_at, password_hash, outfitter_id) FROM stdin;
zddwhpv725	crwhattrick03@gmail.com	Cole	Wilkins	19033884533	\N	admin	2025-05-23 19:11:03.997	2025-05-23 19:11:03.997	$2b$12$k.DM319GL39KPvwmHbr54u9YnRN8g.7J.AODpaSrSlWragVc41Nka	1
\.


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.activities_id_seq', 1, false);


--
-- Name: addon_inventory_dates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.addon_inventory_dates_id_seq', 1, false);


--
-- Name: booking_guides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.booking_guides_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customers_id_seq', 2, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: experience_addons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.experience_addons_id_seq', 1, false);


--
-- Name: experience_guides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.experience_guides_id_seq', 1, false);


--
-- Name: experience_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.experience_locations_id_seq', 1, false);


--
-- Name: experiences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.experiences_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.locations_id_seq', 23, true);


--
-- Name: outfitters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.outfitters_id_seq', 1, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, true);


--
-- Name: user_outfitters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_outfitters_id_seq', 1, true);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: addon_inventory_dates addon_inventory_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addon_inventory_dates
    ADD CONSTRAINT addon_inventory_dates_pkey PRIMARY KEY (id);


--
-- Name: booking_guides booking_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.booking_guides
    ADD CONSTRAINT booking_guides_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_booking_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_number_unique UNIQUE (booking_number);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: experience_addons experience_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_addons
    ADD CONSTRAINT experience_addons_pkey PRIMARY KEY (id);


--
-- Name: experience_guides experience_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_guides
    ADD CONSTRAINT experience_guides_pkey PRIMARY KEY (id);


--
-- Name: experience_locations experience_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_locations
    ADD CONSTRAINT experience_locations_pkey PRIMARY KEY (id);


--
-- Name: experiences experiences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experiences
    ADD CONSTRAINT experiences_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: outfitters outfitters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.outfitters
    ADD CONSTRAINT outfitters_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: user_outfitters user_outfitters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_outfitters
    ADD CONSTRAINT user_outfitters_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: activities activities_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: activities activities_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: addon_inventory_dates addon_inventory_dates_addon_id_experience_addons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addon_inventory_dates
    ADD CONSTRAINT addon_inventory_dates_addon_id_experience_addons_id_fk FOREIGN KEY (addon_id) REFERENCES public.experience_addons(id);


--
-- Name: booking_guides booking_guides_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.booking_guides
    ADD CONSTRAINT booking_guides_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: booking_guides booking_guides_guide_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.booking_guides
    ADD CONSTRAINT booking_guides_guide_id_users_id_fk FOREIGN KEY (guide_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: bookings bookings_experience_id_experiences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_experience_id_experiences_id_fk FOREIGN KEY (experience_id) REFERENCES public.experiences(id);


--
-- Name: bookings bookings_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: customers customers_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: documents documents_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: documents documents_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: documents documents_guide_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_guide_id_users_id_fk FOREIGN KEY (guide_id) REFERENCES public.users(id);


--
-- Name: documents documents_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: experience_addons experience_addons_experience_id_experiences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_addons
    ADD CONSTRAINT experience_addons_experience_id_experiences_id_fk FOREIGN KEY (experience_id) REFERENCES public.experiences(id);


--
-- Name: experience_guides experience_guides_experience_id_experiences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_guides
    ADD CONSTRAINT experience_guides_experience_id_experiences_id_fk FOREIGN KEY (experience_id) REFERENCES public.experiences(id);


--
-- Name: experience_guides experience_guides_guide_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_guides
    ADD CONSTRAINT experience_guides_guide_id_users_id_fk FOREIGN KEY (guide_id) REFERENCES public.users(id);


--
-- Name: experience_locations experience_locations_experience_id_experiences_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_locations
    ADD CONSTRAINT experience_locations_experience_id_experiences_id_fk FOREIGN KEY (experience_id) REFERENCES public.experiences(id);


--
-- Name: experience_locations experience_locations_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experience_locations
    ADD CONSTRAINT experience_locations_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: experiences experiences_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experiences
    ADD CONSTRAINT experiences_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: experiences experiences_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.experiences
    ADD CONSTRAINT experiences_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: locations locations_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: payments payments_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: payments payments_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: settings settings_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: user_outfitters user_outfitters_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_outfitters
    ADD CONSTRAINT user_outfitters_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: user_outfitters user_outfitters_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_outfitters
    ADD CONSTRAINT user_outfitters_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_outfitter_id_outfitters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_outfitter_id_outfitters_id_fk FOREIGN KEY (outfitter_id) REFERENCES public.outfitters(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

