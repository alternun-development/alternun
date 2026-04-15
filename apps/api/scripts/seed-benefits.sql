-- ─────────────────────────────────────────────────────────────────────────────
-- Benefits schema + seed data
-- Run via Supabase SQL editor or psql:
--   psql $DATABASE_URL -f apps/api/scripts/seed-benefits.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS benefit_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,          -- eco | experiencias | premium | cursos
  sort_order   int  NOT NULL DEFAULT 0,
  rating       numeric(3,1) NOT NULL DEFAULT 0,
  is_top_rated boolean NOT NULL DEFAULT false,
  atn_min      int NOT NULL DEFAULT 0,        -- minimum ATN to redeem
  cover_urls   text[] NOT NULL DEFAULT '{}',  -- ordered image URLs
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benefit_category_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES benefit_categories(id) ON DELETE CASCADE,
  locale      text NOT NULL CHECK (locale IN ('en','es','th')),
  title       text NOT NULL,
  meta        text NOT NULL,
  description text NOT NULL,
  info_body   text NOT NULL,
  cta_label   text NOT NULL,
  tag1        text NOT NULL DEFAULT '',
  tag2        text NOT NULL DEFAULT '',
  UNIQUE (category_id, locale)
);

CREATE TABLE IF NOT EXISTS benefit_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES benefit_categories(id) ON DELETE CASCADE,
  slug        text NOT NULL,
  image_url   text NOT NULL,
  atn_price   int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS benefit_item_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES benefit_items(id) ON DELETE CASCADE,
  locale      text NOT NULL CHECK (locale IN ('en','es','th')),
  title       text NOT NULL,
  description text NOT NULL,
  UNIQUE (item_id, locale)
);

-- ── Enable Row-Level Security (public read) ───────────────────────────────────

ALTER TABLE benefit_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_category_content  ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_item_content      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefit_categories' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON benefit_categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefit_category_content' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON benefit_category_content FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefit_items' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON benefit_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'benefit_item_content' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON benefit_item_content FOR SELECT USING (true);
  END IF;
END $$;

-- ── Seed: categories ──────────────────────────────────────────────────────────

INSERT INTO benefit_categories (slug, sort_order, rating, is_top_rated, atn_min, cover_urls)
VALUES
  ('eco', 1, 4.8, true, 120, ARRAY[
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop'
  ]),
  ('experiencias', 2, 4.9, false, 240, ARRAY[
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop'
  ]),
  ('premium', 3, 4.7, false, 400, ARRAY[
    'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2069&auto=format&fit=crop'
  ]),
  ('cursos', 4, 4.6, false, 80, ARRAY[
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop'
  ])
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: category content (EN) ───────────────────────────────────────────────

INSERT INTO benefit_category_content (category_id, locale, title, meta, description, info_body, cta_label, tag1, tag2)
SELECT id, 'en', title, meta, description, info_body, cta_label, tag1, tag2
FROM benefit_categories
JOIN (VALUES
  ('eco',
   'Eco Products',
   'Regenerative agriculture',
   'Organic and sustainable products verified by the Alternun ecosystem.',
   'Access exclusive discounts on sustainable products from our allied brands. From organic clothing to ecological cleaning products.',
   'Shop Now',
   'Organic', 'Sustainable'),
  ('experiencias',
   'Experiences',
   'Curated escapes',
   'Discover curated trips, retreats, and experiences designed to reward positive impact.',
   'Discover curated trips, retreats, and nature experiences designed to reward positive impact. Each experience connects you with regenerative ecosystems around the world.',
   'Explore Experiences',
   'Travel', 'Adventure'),
  ('premium',
   'Premium',
   'Premium access',
   'Unlock exclusive perks, priority access, and elevated support across the ecosystem.',
   'Enjoy priority access, elevated support, and exclusive perks throughout the ecosystem. Premium membership unlocks the best Alternun has to offer, including private events and personalized guidance.',
   'Live the Experience',
   'Exclusive', 'Members'),
  ('cursos',
   'Courses',
   'Education',
   'Learn practical regenerative skills with courses, workshops, and verified guidance.',
   'Learn practical regenerative skills with expert-led courses, workshops, and verified certifications. Build knowledge that translates directly into positive impact.',
   'Start Learning',
   'Learning', 'Verified')
) AS v(slug, title, meta, description, info_body, cta_label, tag1, tag2)
  ON benefit_categories.slug = v.slug
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── Seed: category content (ES) ───────────────────────────────────────────────

INSERT INTO benefit_category_content (category_id, locale, title, meta, description, info_body, cta_label, tag1, tag2)
SELECT id, 'es', title, meta, description, info_body, cta_label, tag1, tag2
FROM benefit_categories
JOIN (VALUES
  ('eco',
   'Productos Eco',
   'Agricultura regenerativa',
   'Productos orgánicos y sostenibles verificados por el ecosistema Alternun.',
   'Accede a descuentos exclusivos en productos sostenibles de nuestras marcas aliadas. Desde ropa orgánica hasta productos de limpieza ecológicos.',
   'Comprar Ahora',
   'Orgánico', 'Sostenible'),
  ('experiencias',
   'Experiencias',
   'Escapadas curadas',
   'Descubre viajes, retiros y experiencias diseñados para recompensar tu impacto positivo.',
   'Descubre viajes, retiros y experiencias en la naturaleza diseñadas para recompensar tu impacto positivo. Cada experiencia te conecta con ecosistemas regenerativos alrededor del mundo.',
   'Explorar Experiencias',
   'Viajes', 'Aventura'),
  ('premium',
   'Premium',
   'Acceso premium',
   'Desbloquea beneficios exclusivos, acceso prioritario y soporte mejorado en todo el ecosistema.',
   'Disfruta de acceso prioritario, soporte mejorado y beneficios exclusivos en todo el ecosistema. La membresía Premium desbloquea lo mejor que Alternun tiene para ofrecer.',
   'Vivir la Experiencia',
   'Exclusivo', 'Miembros'),
  ('cursos',
   'Cursos',
   'Educación',
   'Aprende habilidades regenerativas prácticas con cursos, talleres y guía verificada.',
   'Aprende habilidades regenerativas prácticas con cursos, talleres y certificaciones verificadas dirigidos por expertos. Construye conocimiento que se traduce directamente en impacto positivo.',
   'Empezar a Aprender',
   'Aprendizaje', 'Verificado')
) AS v(slug, title, meta, description, info_body, cta_label, tag1, tag2)
  ON benefit_categories.slug = v.slug
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── Seed: category content (TH) ───────────────────────────────────────────────

INSERT INTO benefit_category_content (category_id, locale, title, meta, description, info_body, cta_label, tag1, tag2)
SELECT id, 'th', title, meta, description, info_body, cta_label, tag1, tag2
FROM benefit_categories
JOIN (VALUES
  ('eco',
   'สินค้าอีโค',
   'เกษตรฟื้นฟู',
   'ผลิตภัณฑ์ออร์แกนิกและยั่งยืนที่ผ่านการตรวจสอบโดยระบบนิเวศ Alternun.',
   'เข้าถึงส่วนลดพิเศษสำหรับผลิตภัณฑ์ยั่งยืนจากแบรนด์พันธมิตรของเรา ตั้งแต่เสื้อผ้าออร์แกนิกไปจนถึงผลิตภัณฑ์ทำความสะอาดเชิงนิเวศ',
   'ซื้อเลย',
   'ออร์แกนิก', 'ยั่งยืน'),
  ('experiencias',
   'ประสบการณ์',
   'การพักผ่อนที่คัดสรร',
   'ค้นหาทริป รีทรีต และประสบการณ์ที่ออกแบบมาเพื่อให้รางวัลกับผลกระทบเชิงบวกของคุณ.',
   'ค้นหาทริป รีทรีต และประสบการณ์ในธรรมชาติที่ออกแบบมาเพื่อให้รางวัลกับผลกระทบเชิงบวก แต่ละประสบการณ์เชื่อมต่อคุณกับระบบนิเวศฟื้นฟูทั่วโลก',
   'สำรวจประสบการณ์',
   'ท่องเที่ยว', 'ผจญภัย'),
  ('premium',
   'พรีเมียม',
   'การเข้าถึงพิเศษ',
   'ปลดล็อคสิทธิพิเศษ การเข้าถึงก่อนใคร และการสนับสนุนระดับสูงทั่วระบบนิเวศ.',
   'เพลิดเพลินกับการเข้าถึงก่อนใคร การสนับสนุนระดับสูง และสิทธิพิเศษทั่วระบบนิเวศ สมาชิกพรีเมียมปลดล็อคสิ่งที่ดีที่สุดที่ Alternun มีให้',
   'สัมผัสประสบการณ์',
   'เอ็กซ์คลูซีฟ', 'สมาชิก'),
  ('cursos',
   'หลักสูตร',
   'การศึกษา',
   'เรียนรู้ทักษะฟื้นฟูที่ใช้ได้จริงด้วยหลักสูตร เวิร์กช็อป และคำแนะนำที่ตรวจสอบแล้ว.',
   'เรียนรู้ทักษะฟื้นฟูที่ใช้ได้จริงด้วยหลักสูตร เวิร์กช็อป และใบรับรองที่ตรวจสอบแล้วจากผู้เชี่ยวชาญ สร้างความรู้ที่แปลงเป็นผลกระทบเชิงบวกโดยตรง',
   'เริ่มเรียนรู้',
   'การเรียนรู้', 'ตรวจสอบแล้ว')
) AS v(slug, title, meta, description, info_body, cta_label, tag1, tag2)
  ON benefit_categories.slug = v.slug
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── Seed: benefit items ───────────────────────────────────────────────────────

-- Eco Products items
INSERT INTO benefit_items (category_id, slug, image_url, atn_price, is_featured, sort_order)
SELECT c.id, v.slug, v.image_url, v.atn_price, v.is_featured, v.sort_order
FROM benefit_categories c
JOIN (VALUES
  ('eco', 'organic-coffee-kit',
   'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1961&auto=format&fit=crop',
   120, true, 1),
  ('eco', 'natural-cleaning-kit',
   'https://images.unsplash.com/photo-1583947581924-860bda6a26df?q=80&w=1967&auto=format&fit=crop',
   180, false, 2),
  ('eco', 'bamboo-clothing-set',
   'https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop',
   250, false, 3),
  ('eco', 'organic-seed-pack',
   'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=2070&auto=format&fit=crop',
   90, false, 4)
) AS v(cat_slug, slug, image_url, atn_price, is_featured, sort_order)
  ON c.slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;

-- Experiences items
INSERT INTO benefit_items (category_id, slug, image_url, atn_price, is_featured, sort_order)
SELECT c.id, v.slug, v.image_url, v.atn_price, v.is_featured, v.sort_order
FROM benefit_categories c
JOIN (VALUES
  ('experiencias', 'mountain-retreat',
   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
   240, true, 1),
  ('experiencias', 'eco-lodge-weekend',
   'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070&auto=format&fit=crop',
   350, false, 2),
  ('experiencias', 'river-kayaking',
   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070&auto=format&fit=crop',
   150, false, 3)
) AS v(cat_slug, slug, image_url, atn_price, is_featured, sort_order)
  ON c.slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;

-- Premium items
INSERT INTO benefit_items (category_id, slug, image_url, atn_price, is_featured, sort_order)
SELECT c.id, v.slug, v.image_url, v.atn_price, v.is_featured, v.sort_order
FROM benefit_categories c
JOIN (VALUES
  ('premium', 'vip-membership',
   'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=2069&auto=format&fit=crop',
   400, true, 1),
  ('premium', 'private-events-access',
   'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
   500, false, 2),
  ('premium', 'priority-support',
   'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2070&auto=format&fit=crop',
   200, false, 3)
) AS v(cat_slug, slug, image_url, atn_price, is_featured, sort_order)
  ON c.slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;

-- Courses items
INSERT INTO benefit_items (category_id, slug, image_url, atn_price, is_featured, sort_order)
SELECT c.id, v.slug, v.image_url, v.atn_price, v.is_featured, v.sort_order
FROM benefit_categories c
JOIN (VALUES
  ('cursos', 'permaculture-basics',
   'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
   80, true, 1),
  ('cursos', 'regenerative-agriculture',
   'https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=2074&auto=format&fit=crop',
   120, false, 2),
  ('cursos', 'ecosystem-restoration',
   'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop',
   160, false, 3)
) AS v(cat_slug, slug, image_url, atn_price, is_featured, sort_order)
  ON c.slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;

-- ── Seed: item content (EN) ───────────────────────────────────────────────────

INSERT INTO benefit_item_content (item_id, locale, title, description)
SELECT i.id, 'en', v.title, v.description
FROM benefit_items i
JOIN benefit_categories c ON i.category_id = c.id
JOIN (VALUES
  ('eco',          'organic-coffee-kit',       'Organic Coffee Kit',         'Premium single-origin coffee sourced from regenerative farms. Includes 3 blends verified by the Alternun ecosystem.'),
  ('eco',          'natural-cleaning-kit',     'Natural Cleaning Kit',       'Plant-based cleaning products free from harmful chemicals. Biodegradable packaging, zero-waste certified.'),
  ('eco',          'bamboo-clothing-set',      'Bamboo Clothing Set',        'Ultra-soft bamboo fabric garments. Carbon-neutral production, ethically sourced and verified by our supply chain.'),
  ('eco',          'organic-seed-pack',        'Organic Seed Pack',          'Heirloom vegetable seed collection for home growing. All varieties are open-pollinated and pesticide-free.'),
  ('experiencias', 'mountain-retreat',         'Mountain Retreat',           'A 3-day guided retreat in a certified eco-lodge nestled in the Andes. Includes meditation, hiking and regenerative workshops.'),
  ('experiencias', 'eco-lodge-weekend',        'Eco-Lodge Weekend',          '2-night stay at a solar-powered eco-lodge. Forest bathing, organic meals and a guided nature walk included.'),
  ('experiencias', 'river-kayaking',           'River Kayaking',             'Half-day kayaking expedition through protected wetlands. Led by certified conservation guides.'),
  ('premium',      'vip-membership',           'VIP Membership',             'Full ecosystem access with priority support, early feature access, and invitations to exclusive Alternun events.'),
  ('premium',      'private-events-access',    'Private Events Access',      'Exclusive invitations to members-only summits, roundtables, and networking events with regenerative leaders.'),
  ('premium',      'priority-support',         'Priority Support',           'Dedicated support line with 4-hour response time, personal account manager, and access to premium resources.'),
  ('cursos',       'permaculture-basics',      'Permaculture Basics',        '4-week online course covering permaculture design principles. Includes certification upon completion.'),
  ('cursos',       'regenerative-agriculture', 'Regenerative Agriculture',   '6-week deep-dive into soil health, composting, and food-forest design. With expert Q&A sessions.'),
  ('cursos',       'ecosystem-restoration',    'Ecosystem Restoration',      'Hands-on curriculum for restoring degraded land. Covers native species reintroduction and watershed management.')
) AS v(cat_slug, item_slug, title, description)
  ON c.slug = v.cat_slug AND i.slug = v.item_slug
ON CONFLICT (item_id, locale) DO NOTHING;

-- ── Seed: item content (ES) ───────────────────────────────────────────────────

INSERT INTO benefit_item_content (item_id, locale, title, description)
SELECT i.id, 'es', v.title, v.description
FROM benefit_items i
JOIN benefit_categories c ON i.category_id = c.id
JOIN (VALUES
  ('eco',          'organic-coffee-kit',       'Kit de Café Orgánico',            'Café de origen único de granjas regenerativas. Incluye 3 mezclas verificadas por el ecosistema Alternun.'),
  ('eco',          'natural-cleaning-kit',     'Kit de Limpieza Natural',         'Productos de limpieza de origen vegetal sin químicos dañinos. Envase biodegradable, certificado cero residuos.'),
  ('eco',          'bamboo-clothing-set',      'Set de Ropa de Bambú',            'Prendas de tela de bambú ultrasuave. Producción carbono neutral, éticamente abastecida y verificada.'),
  ('eco',          'organic-seed-pack',        'Pack de Semillas Orgánicas',      'Colección de semillas de verduras de herencia para cultivo en casa. Todas las variedades son de polinización abierta y libres de pesticidas.'),
  ('experiencias', 'mountain-retreat',         'Retiro de Montaña',               'Retiro guiado de 3 días en un eco-lodge certificado en los Andes. Incluye meditación, senderismo y talleres regenerativos.'),
  ('experiencias', 'eco-lodge-weekend',        'Fin de Semana en Eco-Lodge',      '2 noches en un eco-lodge con energía solar. Baño de bosque, comidas orgánicas y caminata guiada incluidos.'),
  ('experiencias', 'river-kayaking',           'Kayak en Río',                    'Expedición de medio día en kayak por humedales protegidos. Guiada por guías certificados en conservación.'),
  ('premium',      'vip-membership',           'Membresía VIP',                   'Acceso completo al ecosistema con soporte prioritario, acceso anticipado a funciones e invitaciones a eventos exclusivos de Alternun.'),
  ('premium',      'private-events-access',    'Acceso a Eventos Privados',       'Invitaciones exclusivas a cumbres, mesas redondas y eventos de networking con líderes regenerativos.'),
  ('premium',      'priority-support',         'Soporte Prioritario',             'Línea de soporte dedicada con respuesta en 4 horas, gerente de cuenta personal y acceso a recursos premium.'),
  ('cursos',       'permaculture-basics',      'Bases de Permacultura',           'Curso online de 4 semanas sobre principios de diseño en permacultura. Incluye certificación al finalizar.'),
  ('cursos',       'regenerative-agriculture', 'Agricultura Regenerativa',        'Inmersión de 6 semanas en salud del suelo, compostaje y diseño de bosques alimentarios. Con sesiones de preguntas con expertos.'),
  ('cursos',       'ecosystem-restoration',    'Restauración de Ecosistemas',     'Plan de estudios práctico para restaurar tierras degradadas. Cubre reintroducción de especies nativas y manejo de cuencas.')
) AS v(cat_slug, item_slug, title, description)
  ON c.slug = v.cat_slug AND i.slug = v.item_slug
ON CONFLICT (item_id, locale) DO NOTHING;
