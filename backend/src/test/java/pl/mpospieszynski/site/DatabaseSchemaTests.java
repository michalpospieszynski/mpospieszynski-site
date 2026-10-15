package pl.mpospieszynski.site;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

/** B2: every migration, including the dev sample content, applies cleanly and the data model holds its rules. */
@SpringBootTest(properties = "spring.flyway.locations=classpath:db/migration,classpath:db/dev")
@Import(TestcontainersConfiguration.class)
@Transactional
class DatabaseSchemaTests {

    @Autowired
    Flyway flyway;

    @Autowired
    JdbcClient jdbc;

    @Test
    void allMigrationsAreApplied() {
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.info().applied())
                .extracting(m -> m.getScript())
                .contains("V1__init.sql", "V2__technologies_seed.sql", "R__dev_sample_content.sql");
    }

    @Test
    void readsSampleSettingsInBothLanguages() {
        assertThat(jdbc.sql("select full_name from site_settings where id = 1").query(String.class).single())
                .isEqualTo("Michał Pospieszyński");
        assertThat(jdbc.sql("select locale from site_settings_translation order by locale").query(String.class).list())
                .containsExactly("en", "pl");
    }

    @Test
    void readsFourPublishedProjectsWithOnePolishOnly() {
        assertThat(count("select count(*) from project where status = 'PUBLISHED'")).isEqualTo(4);
        assertThat(jdbc.sql("""
                        select pl.slug from project_translation pl
                        where pl.locale = 'pl'
                          and not exists (select 1 from project_translation en where en.project_id = pl.project_id and en.locale = 'en')
                        """).query(String.class).list())
                .containsExactly("raporty-sprzedazy");
        assertThat(count("select count(*) from project_technology")).isEqualTo(18); // 16 published + 2 on the draft
    }

    @Test
    void readsSkillsServicesAndFaqInBothLanguages() {
        assertThat(count("select count(*) from technology")).isEqualTo(25);
        assertThat(count("select count(*) from expertise_area_translation")).isEqualTo(6);
        assertThat(count("select count(*) from expertise_area_project")).isEqualTo(5);
        assertThat(count("select count(*) from service_translation")).isEqualTo(8); // 3 services in pl+en, 304 and 305 pl only
        assertThat(count("select count(*) from faq_translation")).isEqualTo(6);
        assertThat(count("select count(*) from contact_message")).isEqualTo(2);
    }

    @Test
    void slugsAreUniquePerLanguage() {
        UUID project = insertProject();
        assertThatThrownBy(() -> jdbc.sql("""
                        insert into project_translation (project_id, locale, slug, title, summary, problem_md, solution_md, outcome_md)
                        values (?, 'pl', 'system-zamowien', 't', 's', 'p', 's', 'o')
                        """).params(project).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void translationsAcceptOnlyPolishAndEnglish() {
        UUID project = insertProject();
        assertThatThrownBy(() -> jdbc.sql("""
                        insert into project_translation (project_id, locale, slug, title, summary, problem_md, solution_md, outcome_md)
                        values (?, 'de', 'ein-projekt', 't', 's', 'p', 's', 'o')
                        """).params(project).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAProjectRemovesItsTranslationsAndLinks() {
        UUID id = UUID.fromString("00000000-0000-4000-8000-000000000101");
        jdbc.sql("delete from project where id = ?").params(id).update();

        assertThat(count("select count(*) from project_translation where project_id = '" + id + "'")).isZero();
        assertThat(count("select count(*) from project_technology where project_id = '" + id + "'")).isZero();
        assertThat(count("select count(*) from expertise_area_project where project_id = '" + id + "'")).isZero();
    }

    @Test
    void settingsStayASingleRow() {
        assertThatThrownBy(() -> jdbc.sql("insert into site_settings (id) values (2)").update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertProject() {
        return jdbc.sql("insert into project (kind, started_on) values ('PERSONAL', current_date) returning id")
                .query(UUID.class)
                .single();
    }

    private long count(String sql) {
        return jdbc.sql(sql).query(Long.class).single();
    }
}
