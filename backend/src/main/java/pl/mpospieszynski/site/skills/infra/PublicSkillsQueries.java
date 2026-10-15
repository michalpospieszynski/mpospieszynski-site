package pl.mpospieszynski.site.skills.infra;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/**
 * Read queries behind the skills page (docs/screens/public/05-skills.md): texts in the requested language with
 * the Polish fallback, published projects only. A fixed number of queries per page, independent of the data size.
 */
@Repository
public class PublicSkillsQueries {

    public record AreaRow(UUID id, String textLocale, String title, String summary, String descriptionMd) {
    }

    public record AreaTechnologyRow(UUID areaId, String slug, String name) {
    }

    public record AreaProjectRow(UUID areaId, String slug, String textLocale, String title) {
    }

    public record TechnologyRow(String slug, String name, String category, String description, String descriptionLocale,
                                Integer sinceYear, int projectCount) {
    }

    private final JdbcClient jdbc;

    public PublicSkillsQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<AreaRow> areas(SiteLocale lang) {
        return jdbc.sql("""
                        select a.id, coalesce(t.locale, pl.locale) as text_locale,
                               coalesce(t.title, pl.title) as title,
                               coalesce(t.summary, pl.summary) as summary,
                               case when t.area_id is null then pl.description_md else t.description_md end as description_md
                        from expertise_area a
                        join expertise_area_translation pl on pl.area_id = a.id and pl.locale = 'pl'
                        left join expertise_area_translation t on t.area_id = a.id and t.locale = :lang
                        order by a.sort_order, a.id
                        """)
                .param("lang", lang.code())
                .query(AreaRow.class)
                .list();
    }

    public List<AreaTechnologyRow> areaTechnologies() {
        return jdbc.sql("""
                        select at.area_id, te.slug, te.name
                        from expertise_area_technology at
                        join technology te on te.id = at.technology_id
                        order by at.sort_order, te.name
                        """)
                .query(AreaTechnologyRow.class)
                .list();
    }

    /** Evidence projects: published only, in `lang` or else Polish, in the project list order. */
    public List<AreaProjectRow> areaProjects(SiteLocale lang) {
        return jdbc.sql("""
                        select ap.area_id, coalesce(t.slug, pl.slug) as slug, coalesce(t.locale, pl.locale) as text_locale,
                               coalesce(t.title, pl.title) as title
                        from expertise_area_project ap
                        join project p on p.id = ap.project_id and p.status = 'PUBLISHED'
                        join project_translation pl on pl.project_id = p.id and pl.locale = 'pl'
                        left join project_translation t on t.project_id = p.id and t.locale = :lang
                        order by p.featured desc, p.sort_order, p.started_on desc
                        """)
                .param("lang", lang.code())
                .query(AreaProjectRow.class)
                .list();
    }

    /** Technologies shown on the skills page in their sort order, with published project counts. */
    public List<TechnologyRow> technologies(SiteLocale lang) {
        return jdbc.sql("""
                        select te.slug, te.name, te.category,
                               coalesce(t.description, pl.description) as description,
                               case when t.technology_id is not null then t.locale
                                    when pl.technology_id is not null then 'pl' end as description_locale,
                               te.since_year,
                               (select count(distinct p.id)
                                from project_technology pt
                                join project p on p.id = pt.project_id and p.status = 'PUBLISHED'
                                where pt.technology_id = te.id) as project_count
                        from technology te
                        left join technology_translation t on t.technology_id = te.id and t.locale = :lang
                        left join technology_translation pl on pl.technology_id = te.id and pl.locale = 'pl'
                        where te.show_on_skills_page
                        order by te.sort_order, te.name
                        """)
                .param("lang", lang.code())
                .query(TechnologyRow.class)
                .list();
    }
}
