package pl.mpospieszynski.site.profile.infra;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/**
 * Read-only lookups the profile needs from media and projects, in the requested language with a Polish
 * fallback. Plain SQL until the media and projects features expose services for this.
 */
@Repository
public class ProfileLookups {

    public record PortraitRow(String storageKey, String altText, Integer width, Integer height) {
    }

    public record SlugRow(String slug, String locale) {
    }

    private final JdbcClient jdbc;

    public ProfileLookups(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<PortraitRow> portrait(UUID mediaId, SiteLocale lang) {
        return jdbc.sql("""
                        select m.storage_key, coalesce(t.alt_text, pl.alt_text, '') as alt_text, m.width, m.height
                        from media m
                        left join media_translation t on t.media_id = m.id and t.locale = :lang
                        left join media_translation pl on pl.media_id = m.id and pl.locale = 'pl'
                        where m.id = :id
                        """)
                .param("id", mediaId)
                .param("lang", lang.code())
                .query(PortraitRow.class)
                .optional();
    }

    /** Slug of a published project in the requested language, else its Polish slug. */
    public Optional<SlugRow> publishedProjectSlug(UUID projectId, SiteLocale lang) {
        return jdbc.sql("""
                        select t.slug, t.locale
                        from project p
                        join project_translation t on t.project_id = p.id and t.locale in (:lang, 'pl')
                        where p.id = :id and p.status = 'PUBLISHED'
                        order by case when t.locale = :lang then 0 else 1 end
                        limit 1
                        """)
                .param("id", projectId)
                .param("lang", lang.code())
                .query(SlugRow.class)
                .optional();
    }
}
