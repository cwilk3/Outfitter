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
15	Northern Ranch	1026 N Winnetka Ave	Dallas	TX	75208		["data:image/png;base64,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oBDiPUACJEACJEACJOBYAhRCjl16TpwESIAESIAESIBCiPcACZAACZAACZCAYwlQCDl26TlxEiABEiABEiABCiHeAyRAAiRAAiRAAo4lQCHk2KXnxEmABEiABEiABCiEeA+QAAmQAAmQAAk4lgCFkGOXnhMnARIgARIgARKgEOI9QAIkQAIkQAIk4FgCFEKOXXpOnARIgARIgARIgEKI9wAJkAAJkAAJkIBjCVAIOXbpOXESIAESIAESIAEKId4DJEACJEACJEACjiVAIeTYpefESYAESIAESIAEKIR4D5AACZAACZAACTiWAIWQY5eeEycBEiABEiABEqAQ4j1AAiRAAiRAAiTgWAIUQo5dek6cBEiABEiABEiAQoj3AAmQAAmQAAmQgGMJUAg5duk5cRIgARIgARIgAQoh3gMkQAIkQAIkQAKOJUAh5Nil58RJgARIgARIgAQohHgPkAAJkAAJkAAJOJYAhZBjl54TJwESIAESIAESoBDiPUACJEACJEACJOBYAhRCjl16TpwESIAESIAESIBCiPcACZAACZAACZCAYwlQCDl26TlxEiABEiABEiABCiHeAyRAAiRAAiRAAo4lQCHk2KXnxEmABEiABEiABCiEeA+QAAmQAAmQAAk4lgCFkGOXnhMnARIgARIgARKgEOI9QAIkQAIkQAIk4FgCFEKOXXpOnARIgARIgARIgEKI9wAJkAAJkAAJkIBjCVAIOXbpOXESIAESIAESIAEKId4DJEACJEACJEACjiVAIeTYpefESYAESIAESIAEKIR4D5AACZAACZAACTiWAIWQY5eeEycBEiABEiABEqAQ4j1AAiRAAiRAAiTgWAIUQo5dek6cBEiABEiABEiAQoj3AAmQAAmQAAmQgGMJUAg5duk5cRIgARIgARIgAQoh3gMkQAIkQAIkQAKOJUAh5Nil58RJgARIgARIgAQohHgPkAAJkAAJkAAJOJYAhZBjl54TJwESIAESIAESoBDiPUACJEACJEACJOBYAhRCjl16TpwESIAESIAESIBCiPcACZAACZAACZCAYwlQCDl26TlxEhAZGxuTnt4n8uLFCxkZHZXep73y448/yuDQoDzr7/8ZogD/AImMjJDgoGDzu8DAQIleuFBCg0MkNib2Z4/nD0iABEjA2wlQCHn7CvH6SMBFBJ6PP4fQeSr9AwPS9ahL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mZmyesNamTpzulrd9pfo3mLjYqRRvYbSTq/t/j17m4edEt0BN0YCJFCEAIVQESTXzgcZGRmye/9eOay+CDm5uQUHlqhTXq3UAlS1cpWCz/gPCZDAlSFw/sIFWbL8W5k5d7akph4rsZ36psKGDxoiLZu1KLHtckMkQALBCVAIBefDb0mABEigEIEMdT7/bu0a4x908ODBQt+F+yY2Plbap7STYQNulhbNmktEhYhwN8XfkQAJuCRAIeQSGFcnARIo3wSys7NNMMPET6fIrj27iwUjKipSaqqfX4c2bU2UZ1MNdIiMiCzWNvljEiABdwQohNzx4tokQALlnABSFOzdv08+mPixBjZsDZsGpsIQwderaw8zFZasU90REbQEhQ2UPySBMAlQCIUJjj8jARIovwQQwDB77hxZsHiRpKWluQYBEYT8QIP7D1QR1FxiopnKwDVE/oAESogAhVAJgeRmSIAEyg+BXA1e2KOBDAihX7dpg2S7SICK0PjuHbtI/159pH69ehRB5ee0YUuvUQIUQtdox/CwSIAErm0COTk5snPPLpk66zPZtHWL5GTnBD3gmJhoMwXWv1dfadWylVTWnF+cCguKjF+SwBUhQCF0RTBzJyRAAl4kAMvQrr27ZcKnk2WLZoXPzbmc78u/vdExUSqCWspwLZUBv6DoqGj/r/k/CZDAVSRAIXQV4XPXJEACZZ8AnKdPnzktazasl7la423Pvr0ilyo4RkZFmHImtwwaanyCYmNjGBVW9rucLfAYAQohj3Uom0MCJHB1CORp6Y2LKoqsCgFjCqy8FwS+Or3CvZJAaAIUQqEZcQ0SIAESIAESIAGPEqAQ8mjHslkkQAIkQAIkQAKhCVAIhWbENUiABEiABEiABDxKgELIox3LZpEACZAACZAACYQmQCEUmhHXIAESIAESIAES8CgBCiGPdiybRQIkQAIkQAIkEJoAhVBoRlyDBEiABEiABEjAowQohDzasWwWCZAACZAACZBAaAIUQqEZcQ0SIAESIAESIAGPEqAQ8mjHslkkQAIkQAIkQAKhCVAIhWbENUiABEiABEiABDxKgELIox3LZpEACZAACZAACYQmQCEUmhHXIAESIAESIAES8CgBCiGPdiybRQIkQAIkQAIkEJoAhVBoRlyDBEiABEiABEjAowQohDzasWwWCZAACZAACZBAaAIUQqEZ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wk8Hfxf1+snv00spCHAe6n7RpyW978D+hCXTRAzqdZynx+ELZzfrmWsj3yEZTOCcjinW0j6mwGPkexJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESPpo8BMAAAQZSURBVMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniFAIeSZrmRDSIAESIAESIAE3BKgEHJLjOuTAAmQAAmQAAl4hgCFkGe6kg0hARIgARIgARJwS4BCyC0xrk8CJEACJEACJOAZAhRCnulKNoQESIAESIAESMAtAQoht8S4PgmQAAmQAAmQgGcIUAh5pivZEBIgARIgARIgAbcEKITcEuP6JEACJEACJEACniHw/wFxyyj/eglKSgAAAABJRU5ErkJggg=="]	t	1	2025-05-23 22:46:44.188149	2025-05-23 22:46:44.188149
22	Dallas Ranch	1026 N Winnetka Ave	Dallas	TX	75208		[]	t	1	2025-05-25 01:38:53.341244	2025-05-25 01:38:53.341244
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
1	Outfitter Demo	123 Main St	555-0123	demo@outfitter.com	\N	\N	\N	\N	\N	\N	\N	2025-05-23 16:56:26.961598
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

