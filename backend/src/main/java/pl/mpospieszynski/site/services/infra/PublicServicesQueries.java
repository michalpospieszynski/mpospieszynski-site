package pl.mpospieszynski.site.services.infra;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** Read queries behind the services page: active offerings and the FAQ, in `lang` with the Polish fallback. */
@Repository
public class PublicServicesQueries {

    public record ServiceRow(UUID id, String textLocale, String title, String summary, String descriptionMd,
                             String deliverablesMd, String priceNote) {
    }

    public record FaqRow(UUID id, String textLocale, String question, String answerMd) {
    }

    private final JdbcClient jdbc;

    public PublicServicesQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Active offerings in sort order. A translation row is used as a whole: no mixing of languages in one service. */
    public List<ServiceRow> activeServices(SiteLocale lang) {
        return jdbc.sql("""
                        select s.id, coalesce(t.locale, pl.locale) as text_locale,
                               case when t.service_id is null then pl.title else t.title end as title,
                               case when t.service_id is null then pl.summary else t.summary end as summary,
                               case when t.service_id is null then pl.description_md else t.description_md end as description_md,
                               case when t.service_id is null then pl.deliverables_md else t.deliverables_md end as deliverables_md,
                               case when t.service_id is null then pl.price_note else t.price_note end as price_note
                        from service_offering s
                        join service_translation pl on pl.service_id = s.id and pl.locale = 'pl'
                        left join service_translation t on t.service_id = s.id and t.locale = :lang
                        where s.active
                        order by s.sort_order, s.id
                        """)
                .param("lang", lang.code())
                .query(ServiceRow.class)
                .list();
    }

    public List<FaqRow> faq(SiteLocale lang) {
        return jdbc.sql("""
                        select f.id, coalesce(t.locale, pl.locale) as text_locale,
                               case when t.faq_id is null then pl.question else t.question end as question,
                               case when t.faq_id is null then pl.answer_md else t.answer_md end as answer_md
                        from faq f
                        join faq_translation pl on pl.faq_id = f.id and pl.locale = 'pl'
                        left join faq_translation t on t.faq_id = f.id and t.locale = :lang
                        order by f.sort_order, f.id
                        """)
                .param("lang", lang.code())
                .query(FaqRow.class)
                .list();
    }
}
