package pl.mpospieszynski.site.projects.infra;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/**
 * Read queries behind the public project pages: published projects only, texts in the requested language
 * with the Polish translation as fallback (every project has one). Two queries per list, never one per project.
 */
@Repository
public class PublicProjectQueries {

    /** One list row; `textLocale` is the language the texts are actually in. */
    public record ProjectRow(
            UUID id, String kind, boolean featured, LocalDate startedOn, LocalDate finishedOn,
            String textLocale, String slug, String title, String summary, String role,
            String plSlug, String enSlug,
            String coverKey, String coverAlt, Integer coverWidth, Integer coverHeight) {
    }

    public record TechnologyRow(UUID projectId, String slug, String name) {
    }

    /** A case study; texts are always in the requested language (slugs are per language, so no fallback). */
    public record DetailRow(
            UUID id, String kind, boolean featured, LocalDate startedOn, LocalDate finishedOn,
            String repoUrl, String liveUrl,
            String slug, String title, String summary, String role,
            String problemMd, String solutionMd, String outcomeMd, String lessonsMd, String seoDescription,
            String plSlug, String enSlug,
            String coverKey, String coverAlt, Integer coverWidth, Integer coverHeight) {
    }

    public record GalleryRow(String storageKey, String altText, String caption, Integer width, Integer height) {
    }

    public record NeighbourRow(UUID id, String slug, String title) {
    }

    private final JdbcClient jdbc;

    public PublicProjectQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Ordered `featured desc, sort_order`; null filters are not applied. */
    public List<ProjectRow> list(SiteLocale lang, String kind, String technologySlug, Boolean featured) {
        return jdbc.sql("""
                        select p.id, p.kind, p.featured, p.started_on, p.finished_on,
                               coalesce(t.locale, pl.locale) as text_locale,
                               coalesce(t.slug, pl.slug) as slug,
                               coalesce(t.title, pl.title) as title,
                               coalesce(t.summary, pl.summary) as summary,
                               case when t.project_id is null then pl.role else t.role end as role,
                               pl.slug as pl_slug, en.slug as en_slug,
                               m.storage_key as cover_key, coalesce(mt.alt_text, mpl.alt_text, '') as cover_alt,
                               m.width as cover_width, m.height as cover_height
                        from project p
                        join project_translation pl on pl.project_id = p.id and pl.locale = 'pl'
                        left join project_translation t on t.project_id = p.id and t.locale = :lang
                        left join project_translation en on en.project_id = p.id and en.locale = 'en'
                        left join media m on m.id = p.cover_media_id
                        left join media_translation mt on mt.media_id = m.id and mt.locale = :lang
                        left join media_translation mpl on mpl.media_id = m.id and mpl.locale = 'pl'
                        where p.status = 'PUBLISHED'
                          and (cast(:kind as text) is null or p.kind = :kind)
                          and (cast(:featured as boolean) is null or p.featured = :featured)
                          and (cast(:tech as text) is null or exists (
                                select 1 from project_technology pt
                                join technology te on te.id = pt.technology_id
                                where pt.project_id = p.id and te.slug = :tech))
                        order by p.featured desc, p.sort_order, p.started_on desc
                        """)
                .param("lang", lang.code())
                .param("kind", kind)
                .param("featured", featured)
                .param("tech", technologySlug)
                .query(ProjectRow.class)
                .list();
    }

    /** Technologies of the given projects, in the technology order used across the site. */
    public List<TechnologyRow> technologies(Collection<UUID> projectIds) {
        if (projectIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                        select pt.project_id, te.slug, te.name
                        from project_technology pt
                        join technology te on te.id = pt.technology_id
                        where pt.project_id in (:ids)
                        order by te.sort_order, te.name
                        """)
                .param("ids", projectIds)
                .query(TechnologyRow.class)
                .list();
    }

    public Optional<DetailRow> detail(SiteLocale lang, String slug) {
        return detailWhere("p.status = 'PUBLISHED' and t.slug = :key", lang, slug);
    }

    /** Any status, by id: the admin preview of drafts (in `lang` only, no fallback). */
    public Optional<DetailRow> detailById(SiteLocale lang, UUID id) {
        return detailWhere("p.id = :key", lang, id);
    }

    private Optional<DetailRow> detailWhere(String condition, SiteLocale lang, Object key) {
        return jdbc.sql("""
                        select p.id, p.kind, p.featured, p.started_on, p.finished_on, p.repo_url, p.live_url,
                               t.slug, t.title, t.summary, t.role,
                               t.problem_md, t.solution_md, t.outcome_md, t.lessons_md, t.seo_description,
                               pl.slug as pl_slug, en.slug as en_slug,
                               m.storage_key as cover_key, coalesce(mt.alt_text, mpl.alt_text, '') as cover_alt,
                               m.width as cover_width, m.height as cover_height
                        from project_translation t
                        join project p on p.id = t.project_id
                        join project_translation pl on pl.project_id = p.id and pl.locale = 'pl'
                        left join project_translation en on en.project_id = p.id and en.locale = 'en'
                        left join media m on m.id = p.cover_media_id
                        left join media_translation mt on mt.media_id = m.id and mt.locale = :lang
                        left join media_translation mpl on mpl.media_id = m.id and mpl.locale = 'pl'
                        where t.locale = :lang""" + " and " + condition)
                .param("lang", lang.code())
                .param("key", key)
                .query(DetailRow.class)
                .optional();
    }

    /** Gallery images in their order; alt text and caption in `lang`, else Polish. */
    public List<GalleryRow> gallery(UUID projectId, SiteLocale lang) {
        return jdbc.sql("""
                        select m.storage_key, coalesce(t.alt_text, pl.alt_text, '') as alt_text,
                               case when t.media_id is null then pl.caption else t.caption end as caption,
                               m.width, m.height
                        from project_media pm
                        join media m on m.id = pm.media_id
                        left join media_translation t on t.media_id = m.id and t.locale = :lang
                        left join media_translation pl on pl.media_id = m.id and pl.locale = 'pl'
                        where pm.project_id = :id
                        order by pm.sort_order, m.created_at
                        """)
                .param("id", projectId)
                .param("lang", lang.code())
                .query(GalleryRow.class)
                .list();
    }

    /** Published projects that have a text in `lang`, in list order (for previous/next). */
    public List<NeighbourRow> sequence(SiteLocale lang) {
        return jdbc.sql("""
                        select p.id, t.slug, t.title
                        from project p
                        join project_translation t on t.project_id = p.id and t.locale = :lang
                        where p.status = 'PUBLISHED'
                        order by p.featured desc, p.sort_order, p.started_on desc
                        """)
                .param("lang", lang.code())
                .query(NeighbourRow.class)
                .list();
    }

    public boolean technologyExists(String slug) {
        return jdbc.sql("select exists (select 1 from technology where slug = :slug)")
                .param("slug", slug)
                .query(Boolean.class)
                .single();
    }
}
