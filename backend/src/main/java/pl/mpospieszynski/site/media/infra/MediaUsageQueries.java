package pl.mpospieszynski.site.media.infra;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Where a media file is used: project covers and galleries, the settings portrait, and Markdown texts that link
 * `/media/<key>` (a simple `like` search; the volume is small).
 */
@Repository
public class MediaUsageQueries {

    public record UsageRow(String type, UUID id, String label, String role) {
    }

    private final JdbcClient jdbc;

    public MediaUsageQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<UsageRow> usages(UUID mediaId, String storageKey) {
        return jdbc.sql("""
                        select 'PROJECT' as type, p.id, t.title as label, 'cover' as role
                        from project p join project_translation t on t.project_id = p.id and t.locale = 'pl'
                        where p.cover_media_id = :id
                        union all
                        select 'PROJECT', p.id, t.title, 'gallery'
                        from project_media pm join project p on p.id = pm.project_id
                        join project_translation t on t.project_id = p.id and t.locale = 'pl'
                        where pm.media_id = :id
                        union all
                        select 'SETTINGS', null::uuid, s.full_name, 'portrait' from site_settings s where s.portrait_media_id = :id
                        union all
                        select distinct 'PROJECT', p.id, pl.title, 'text'
                        from project_translation t join project p on p.id = t.project_id
                        join project_translation pl on pl.project_id = p.id and pl.locale = 'pl'
                        where concat_ws(' ', t.problem_md, t.solution_md, t.outcome_md, t.lessons_md) like :needle
                        union all
                        select distinct 'SETTINGS', null::uuid, s.full_name, 'text'
                        from site_settings_translation st join site_settings s on s.id = st.settings_id
                        where concat_ws(' ', st.intro_md, st.about_md, st.approach_md) like :needle
                        union all
                        select distinct 'EXPERTISE_AREA', a.area_id, pl.title, 'text'
                        from expertise_area_translation a
                        join expertise_area_translation pl on pl.area_id = a.area_id and pl.locale = 'pl'
                        where a.description_md like :needle
                        union all
                        select distinct 'SERVICE', s.service_id, pl.title, 'text'
                        from service_translation s
                        join service_translation pl on pl.service_id = s.service_id and pl.locale = 'pl'
                        where concat_ws(' ', s.description_md, s.deliverables_md) like :needle
                        union all
                        select distinct 'FAQ', f.faq_id, pl.question, 'text'
                        from faq_translation f join faq_translation pl on pl.faq_id = f.faq_id and pl.locale = 'pl'
                        where f.answer_md like :needle
                        """)
                .param("id", mediaId)
                .param("needle", "%/media/" + storageKey + "%")
                .query(UsageRow.class)
                .list();
    }
}
