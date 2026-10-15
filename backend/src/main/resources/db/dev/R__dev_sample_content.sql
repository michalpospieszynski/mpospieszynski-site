-- Dev-only sample content (profile `dev`, Flyway location classpath:db/dev). Never applied in production.
-- Repeatable: Flyway re-runs it whenever it changes, so it first removes its own rows (fixed ids) and inserts them again.
-- Four published projects (101 with a cover, gallery and code block; 104 Polish only) and one draft that must never appear publicly; expertise areas, services and FAQ in both languages.

delete from contact_message where id in ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000502');
delete from expertise_area where id in ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000203');
delete from service_offering where id in ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000305');
delete from faq where id in ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000403');
update site_settings set site_project_id = null where id = 1;
delete from project where id in ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000105');
delete from media where id in ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000603');
delete from site_settings_translation where settings_id = 1;

-- Settings ------------------------------------------------------------------------------------------

update site_settings
set full_name = 'Michał Pospieszyński',
    availability = 'LIMITED',
    available_from = date '2026-12-01',
    show_availability = true,
    social_links = '{"github": "https://github.com/", "linkedin": "https://www.linkedin.com/", "email": "pospieszynski.michal@gmail.com"}'::jsonb
where id = 1;

insert into site_settings_translation (settings_id, locale, headline, intro_md, about_md, approach_md, location_label, autoreply_subject, autoreply_body_md) values
    (1, 'pl', 'Spokojne systemy dla ważnych procesów',
     'Projektuję i rozwijam backendy w Javie i Spring Boot, tak żeby działały szybko, przewidywalnie i bez nocnych alarmów.',
     'Od lat buduję systemy, które przetwarzają zamówienia, płatności i raporty. Najbardziej lubię moment, w którym wolny proces zaczyna działać w minutach zamiast godzin.',
     'Zaczynam od pomiaru, nie od przepisywania. Pokazuję, gdzie system traci czas, proponuję plan w małych krokach i po każdym z nich sprawdzamy liczby razem.',
     'Polska, praca zdalna',
     'Dziękuję za wiadomość',
     'Dziękuję za kontakt. Odpowiem w ciągu dwóch dni roboczych.'),
    (1, 'en', 'Calm systems for processes that matter',
     'I design and build backends in Java and Spring Boot that run fast, predictably and without night-time alerts.',
     'For years I have built systems that process orders, payments and reports. My favourite moment is when a slow process starts finishing in minutes instead of hours.',
     'I start by measuring, not rewriting. I show where the system loses time, propose a plan in small steps and we check the numbers together after each one.',
     'Poland, remote',
     'Thank you for your message',
     'Thank you for getting in touch. I will reply within two working days.');

-- Projects ------------------------------------------------------------------------------------------

-- Media: SVG diagrams from src/main/resources/dev-media, copied into the local media folder by DevMediaSamples.
insert into media (id, storage_key, mime_type, width, height, size_bytes) values
    ('00000000-0000-4000-8000-000000000601', 'sample-orders-before-after.svg', 'image/svg+xml', 1200, 750, 692),
    ('00000000-0000-4000-8000-000000000602', 'sample-orders-architecture.svg', 'image/svg+xml', 1200, 750, 1416),
    ('00000000-0000-4000-8000-000000000603', 'sample-orders-outbox.svg', 'image/svg+xml', 1200, 750, 842);

insert into media_translation (media_id, locale, alt_text, caption) values
    ('00000000-0000-4000-8000-000000000601', 'pl', 'Wykres: nocne przetwarzanie trwało 4 godziny, po zmianach 25 minut.', null),
    ('00000000-0000-4000-8000-000000000601', 'en', 'Chart: the nightly run took 4 hours, 25 minutes after the changes.', null),
    ('00000000-0000-4000-8000-000000000602', 'pl', 'Schemat: import zamówień trafia do Kafki, cztery workery zapisują do bazy.', 'Przetwarzanie w partiach z równoległymi workerami.'),
    ('00000000-0000-4000-8000-000000000602', 'en', 'Diagram: the order import feeds Kafka, four workers write to the database.', 'Batch processing with parallel workers.'),
    ('00000000-0000-4000-8000-000000000603', 'pl', 'Schemat: tabele orders i outbox w PostgreSQL, zdarzenia z outboxa idą do Kafki.', 'Wzorzec outbox: zdarzenie zapisuje się w tej samej transakcji co zamówienie.'),
    ('00000000-0000-4000-8000-000000000603', 'en', 'Diagram: orders and outbox tables in PostgreSQL, outbox events go to Kafka.', 'The outbox pattern: the event is saved in the same transaction as the order.');

insert into project (id, status, kind, featured, sort_order, started_on, finished_on, repo_url, live_url) values
    ('00000000-0000-4000-8000-000000000101', 'PUBLISHED', 'CLIENT',      true,  10, date '2024-03-01', date '2025-02-28', null, null),
    ('00000000-0000-4000-8000-000000000102', 'PUBLISHED', 'CLIENT',      true,  20, date '2023-06-01', date '2024-01-31', null, null),
    ('00000000-0000-4000-8000-000000000103', 'PUBLISHED', 'PERSONAL',    true,  30, date '2025-09-01', null, 'https://github.com/', 'https://mpospieszynski.pl'),
    ('00000000-0000-4000-8000-000000000104', 'PUBLISHED', 'OPEN_SOURCE', false, 40, date '2022-02-01', date '2022-11-30', 'https://github.com/', null),
    ('00000000-0000-4000-8000-000000000105', 'DRAFT',     'CLIENT',      true,   5, date '2026-01-01', null, null, null);

insert into project_translation (project_id, locale, slug, title, summary, role, problem_md, solution_md, outcome_md, lessons_md, seo_description) values
    ('00000000-0000-4000-8000-000000000101', 'pl', 'system-zamowien', 'System przetwarzania zamówień',
     'Nocne przetwarzanie skrócone z 4 godzin do 25 minut.', 'Główny programista backendu',
     'Nocny proces importu zamówień trwał cztery godziny i często nie kończył się przed rozpoczęciem pracy magazynu.',
     E'Przeniosłem przetwarzanie na partie z równoległymi workerami, dodałem indeksy i wzorzec outbox dla zdarzeń.

```java
@Transactional
public void process(List<Order> batch) {
    orders.saveAll(batch);
    outbox.save(OrderEvents.imported(batch)); // ta sama transakcja
}
```',
     'Proces kończy się w 25 minut, a liczba ręcznych poprawek spadła do zera.',
     'Najpierw pomiar, potem zmiany: połowę zysku dały dwa indeksy.',
     'Jak skróciłem nocne przetwarzanie zamówień z 4 godzin do 25 minut.'),
    ('00000000-0000-4000-8000-000000000101', 'en', 'order-processing-api', 'Order processing system',
     'Nightly processing cut from 4 hours to 25 minutes.', 'Lead backend developer',
     'The nightly order import took four hours and often did not finish before the warehouse started work.',
     E'I moved processing to batches with parallel workers, added indexes and an outbox for events.

```java
@Transactional
public void process(List<Order> batch) {
    orders.saveAll(batch);
    outbox.save(OrderEvents.imported(batch)); // same transaction
}
```',
     'The run now finishes in 25 minutes and manual corrections dropped to zero.',
     'Measure first, change second: two indexes delivered half of the gain.',
     'How I cut nightly order processing from 4 hours to 25 minutes.'),
    ('00000000-0000-4000-8000-000000000102', 'pl', 'migracja-platnosci', 'Migracja płatności',
     'Nowy system płatności bez minuty przestoju.', 'Architekt i programista',
     'Stary moduł płatności blokował rozwój i nie dało się go wyłączyć na czas migracji.',
     'Równoległy zapis do starego i nowego systemu, porównywanie wyników i stopniowe przełączanie ruchu.',
     'Migracja zakończona bez przestoju i bez utraconej transakcji.', null,
     'Migracja systemu płatności bez przestoju.'),
    ('00000000-0000-4000-8000-000000000102', 'en', 'payments-migration', 'Payments migration',
     'A new payment system with zero downtime.', 'Architect and developer',
     'The legacy payment module blocked development and could not be switched off during the migration.',
     'Dual writes to the old and new system, result comparison and gradual traffic switching.',
     'Migration finished with no downtime and no lost transaction.', null,
     'Migrating a payment system with zero downtime.'),
    ('00000000-0000-4000-8000-000000000103', 'pl', 'jak-zbudowana-jest-ta-strona', 'Jak zbudowana jest ta strona',
     'Angular SSR, Spring Boot i Supabase za Cloudflare Tunnel.', 'Autor',
     'Chciałem portfolio, które samo jest dowodem: szybkie, mierzalne i proste w utrzymaniu.',
     'Renderowanie po stronie serwera, API w Spring Boot, dane w Supabase, ruch przez Cloudflare.',
     'Strona pokazuje na żywo, ile trwało jej przygotowanie.', null,
     'Architektura tej strony: Angular SSR, Spring Boot, Supabase.'),
    ('00000000-0000-4000-8000-000000000103', 'en', 'how-this-site-is-built', 'How this site is built',
     'Angular SSR, Spring Boot and Supabase behind Cloudflare Tunnel.', 'Author',
     'I wanted a portfolio that is evidence itself: fast, measurable and easy to maintain.',
     'Server-side rendering, a Spring Boot API, data in Supabase, traffic through Cloudflare.',
     'The page shows live how long it took to prepare.', null,
     'The architecture of this site: Angular SSR, Spring Boot, Supabase.'),
    ('00000000-0000-4000-8000-000000000104', 'pl', 'raporty-sprzedazy', 'Raporty sprzedaży',
     'Raport ładuje się w 2 sekundy zamiast 40.', 'Programista',
     'Raport sprzedaży liczył się przy każdym otwarciu i trwał 40 sekund.',
     'Widok zmaterializowany odświeżany co 5 minut i indeks po dacie.',
     'Raport ładuje się w 2 sekundy.', null,
     'Przyspieszenie raportu sprzedaży z 40 do 2 sekund.');
-- Project 104 has no English translation on purpose (the "Polish only" case).

insert into project_translation (project_id, locale, slug, title, summary, role, problem_md, solution_md, outcome_md, lessons_md, seo_description) values
    ('00000000-0000-4000-8000-000000000105', 'pl', 'szkic-projektu', 'Szkic projektu', 'Szkic, niewidoczny publicznie.', null,
     'Szkic.', 'Szkic.', 'Szkic.', null, null),
    ('00000000-0000-4000-8000-000000000105', 'en', 'draft-project', 'Draft project', 'A draft, never shown publicly.', null,
     'Draft.', 'Draft.', 'Draft.', null, null);

update project set cover_media_id = '00000000-0000-4000-8000-000000000601' where id = '00000000-0000-4000-8000-000000000101';

insert into project_media (project_id, media_id, sort_order) values
    ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000602', 10),
    ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000603', 20);

update site_settings set site_project_id = '00000000-0000-4000-8000-000000000103' where id = 1;

insert into project_technology (project_id, technology_id)
select p.id, t.id
from (values
    ('00000000-0000-4000-8000-000000000101'::uuid, 'java'), ('00000000-0000-4000-8000-000000000101'::uuid, 'spring-boot'),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'postgresql'), ('00000000-0000-4000-8000-000000000101'::uuid, 'kafka'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'java'), ('00000000-0000-4000-8000-000000000102'::uuid, 'spring-boot'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'postgresql'), ('00000000-0000-4000-8000-000000000102'::uuid, 'docker'),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'java'), ('00000000-0000-4000-8000-000000000103'::uuid, 'spring-boot'),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'angular'), ('00000000-0000-4000-8000-000000000103'::uuid, 'typescript'),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'supabase'), ('00000000-0000-4000-8000-000000000103'::uuid, 'cloudflare'),
    ('00000000-0000-4000-8000-000000000104'::uuid, 'sql'), ('00000000-0000-4000-8000-000000000104'::uuid, 'postgresql'),
    ('00000000-0000-4000-8000-000000000105'::uuid, 'java'), ('00000000-0000-4000-8000-000000000105'::uuid, 'redis')
) as link (project_id, slug)
join project p on p.id = link.project_id
join technology t on t.slug = link.slug;

-- Expertise areas -----------------------------------------------------------------------------------

insert into expertise_area (id, icon, sort_order) values
    ('00000000-0000-4000-8000-000000000201', 'api', 10),
    ('00000000-0000-4000-8000-000000000202', 'database', 20),
    ('00000000-0000-4000-8000-000000000203', 'migration', 30);

insert into expertise_area_translation (area_id, locale, title, summary, description_md) values
    ('00000000-0000-4000-8000-000000000201', 'pl', 'Projektowanie API', 'Czytelne, wersjonowane API z dokumentacją OpenAPI.', null),
    ('00000000-0000-4000-8000-000000000201', 'en', 'API design', 'Clear, versioned APIs documented with OpenAPI.', null),
    ('00000000-0000-4000-8000-000000000202', 'pl', 'Wydajność baz danych', 'Indeksy, plany zapytań i przetwarzanie wsadowe.', null),
    ('00000000-0000-4000-8000-000000000202', 'en', 'Database performance', 'Indexes, query plans and batch processing.', null),
    ('00000000-0000-4000-8000-000000000203', 'pl', 'Migracje bez przestoju', 'Zmiana systemu w trakcie jego działania.', null),
    ('00000000-0000-4000-8000-000000000203', 'en', 'Zero-downtime migrations', 'Changing a system while it keeps running.', null);

insert into expertise_area_technology (area_id, technology_id, sort_order)
select a.id, t.id, link.sort_order
from (values
    ('00000000-0000-4000-8000-000000000201'::uuid, 'spring-boot', 10), ('00000000-0000-4000-8000-000000000201'::uuid, 'openapi', 20),
    ('00000000-0000-4000-8000-000000000202'::uuid, 'postgresql', 10), ('00000000-0000-4000-8000-000000000202'::uuid, 'hibernate', 20),
    ('00000000-0000-4000-8000-000000000203'::uuid, 'kafka', 10), ('00000000-0000-4000-8000-000000000203'::uuid, 'docker', 20)
) as link (area_id, slug, sort_order)
join expertise_area a on a.id = link.area_id
join technology t on t.slug = link.slug;

insert into expertise_area_project (area_id, project_id) values
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101'),
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103'),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101'),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000104'),
    ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102');

-- Technologies: "how I use it", since-year and visibility on the skills page. The rows themselves are reference data
-- from V2, so only these columns are reset here. Spring Boot is described in Polish only (English falls back);
-- Kubernetes is hidden from the skills page.

update technology set since_year = null, show_on_skills_page = true;
delete from technology_translation;

update technology set since_year = 2012 where slug = 'java';
update technology set since_year = 2016 where slug = 'spring-boot';
update technology set since_year = 2014 where slug = 'postgresql';
update technology set show_on_skills_page = false where slug = 'kubernetes';

insert into technology_translation (technology_id, locale, description)
select t.id, d.locale, d.description
from (values
    ('java', 'pl', 'Główny język, w którym piszę backendy.'),
    ('java', 'en', 'The main language I write backends in.'),
    ('spring-boot', 'pl', 'Podstawa API i usług: konfiguracja, bezpieczeństwo, testy.'),
    ('postgresql', 'pl', 'Baza, którą znam najlepiej: indeksy, plany zapytań, migracje.'),
    ('postgresql', 'en', 'The database I know best: indexes, query plans, migrations.')
) as d (slug, locale, description)
join technology t on t.slug = d.slug;

-- Services and FAQ ----------------------------------------------------------------------------------

insert into service_offering (id, active, sort_order) values
    ('00000000-0000-4000-8000-000000000301', true, 10),
    ('00000000-0000-4000-8000-000000000302', true, 20),
    ('00000000-0000-4000-8000-000000000303', true, 30),
    ('00000000-0000-4000-8000-000000000304', true, 40),   -- Polish only
    ('00000000-0000-4000-8000-000000000305', false, 50);  -- inactive, never shown

insert into service_translation (service_id, locale, title, summary, description_md, deliverables_md, price_note) values
    ('00000000-0000-4000-8000-000000000301', 'pl', 'Nowy backend', 'API i logika biznesowa od projektu do wdrożenia.', 'Zaczynam od modelu danych i kontraktu API, a kod powstaje w krótkich iteracjach z testami.', E'- Projekt API\n- Implementacja i testy\n- Wdrożenie', 'Wycena po rozmowie'),
    ('00000000-0000-4000-8000-000000000301', 'en', 'New backend', 'API and business logic from design to deployment.', 'I start from the data model and the API contract; the code follows in short, tested iterations.', E'- API design\n- Implementation and tests\n- Deployment', 'Quoted after a call'),
    ('00000000-0000-4000-8000-000000000302', 'pl', 'Przyspieszenie systemu', 'Pomiar, plan i poprawki wydajności.', null, E'- Raport z pomiarów\n- Poprawki w małych krokach', null),
    ('00000000-0000-4000-8000-000000000302', 'en', 'Performance work', 'Measuring, planning and performance fixes.', null, E'- Measurement report\n- Fixes in small steps', null),
    ('00000000-0000-4000-8000-000000000303', 'pl', 'Konsultacje', 'Przegląd architektury lub kodu, godzinowo.', null, null, 'Rozliczenie godzinowe'),
    ('00000000-0000-4000-8000-000000000303', 'en', 'Consulting', 'Architecture or code review, by the hour.', null, null, 'Billed by the hour'),
    ('00000000-0000-4000-8000-000000000304', 'pl', 'Audyt bezpieczeństwa API', 'Przegląd uwierzytelniania, uprawnień i walidacji.', null, null, null),
    ('00000000-0000-4000-8000-000000000305', 'pl', 'Usługa wycofana', 'Ta usługa nie jest już oferowana.', null, null, null);

insert into faq (id, sort_order) values
    ('00000000-0000-4000-8000-000000000401', 10),
    ('00000000-0000-4000-8000-000000000402', 20),
    ('00000000-0000-4000-8000-000000000403', 30);

insert into faq_translation (faq_id, locale, question, answer_md) values
    ('00000000-0000-4000-8000-000000000401', 'pl', 'Czy pracujesz zdalnie?', 'Tak, z klientami z całej Europy.'),
    ('00000000-0000-4000-8000-000000000401', 'en', 'Do you work remotely?', 'Yes, with clients across Europe.'),
    ('00000000-0000-4000-8000-000000000402', 'pl', 'Jak wygląda pierwszy krok?', 'Bezpłatna, 30-minutowa rozmowa o problemie i celach.'),
    ('00000000-0000-4000-8000-000000000402', 'en', 'What is the first step?', 'A free 30-minute call about the problem and goals.'),
    ('00000000-0000-4000-8000-000000000403', 'pl', 'Czy przejmujesz istniejące projekty?', 'Tak, zaczynam od przeglądu kodu i pomiarów.'),
    ('00000000-0000-4000-8000-000000000403', 'en', 'Do you take over existing projects?', 'Yes, starting with a code review and measurements.');

-- Contact messages ----------------------------------------------------------------------------------

insert into contact_message (id, locale, name, email, company, topic, service_id, budget_range, timeline, message, status, created_at) values
    ('00000000-0000-4000-8000-000000000501', 'pl', 'Anna Przykładowa', 'anna@example.com', 'Przykład sp. z o.o.', 'PROJECT',
     '00000000-0000-4000-8000-000000000302', 'MEDIUM', 'QUARTER',
     'Nasz raport miesięczny liczy się godzinę. Czy da się to przyspieszyć?', 'NEW', now() - interval '2 hours'),
    ('00000000-0000-4000-8000-000000000502', 'en', 'John Example', 'john@example.com', null, 'CONSULTATION',
     null, null, null,
     'Could you review the architecture of our Spring Boot service?', 'READ', now() - interval '3 days');
