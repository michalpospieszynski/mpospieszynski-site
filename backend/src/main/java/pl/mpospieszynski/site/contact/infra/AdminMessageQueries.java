package pl.mpospieszynski.site.contact.infra;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The admin inbox (docs/screens/admin/04-messages.md): newest first, `ilike` search over a few columns. */
@Repository
public class AdminMessageQueries {

    public record ListRow(UUID id, String name, String email, String company, String topic, String serviceTitle,
                         String locale, String status, String preview, OffsetDateTime createdAt) {
    }

    public record DetailRow(UUID id, String name, String email, String company, String topic, String serviceTitle,
                           String budgetRange, String timeline, String message, String locale, String status,
                           OffsetDateTime createdAt) {
    }

    private record StatusCount(String status, long count) {
    }

    private static final String SEARCH = """
            (cast(:status as text) is null or m.status = :status)
            and (:q = '' or m.name ilike :like or m.email ilike :like or coalesce(m.company, '') ilike :like
                 or m.message ilike :like)
            """;

    private final JdbcClient jdbc;

    public AdminMessageQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<ListRow> page(String status, String q, int page, int size) {
        return jdbc.sql("""
                        select m.id, m.name, m.email, m.company, m.topic, st.title as service_title, m.locale, m.status,
                               left(m.message, 140) as preview, m.created_at
                        from contact_message m
                        left join service_translation st on st.service_id = m.service_id and st.locale = 'pl'
                        where """ + SEARCH + """
                        order by m.created_at desc, m.id
                        limit :size offset :offset
                        """)
                .param("status", status).param("q", q).param("like", "%" + q + "%")
                .param("size", size).param("offset", (long) page * size)
                .query(ListRow.class).list();
    }

    public long count(String status, String q) {
        return jdbc.sql("select count(*) from contact_message m where " + SEARCH)
                .param("status", status).param("q", q).param("like", "%" + q + "%")
                .query(Long.class).single();
    }

    /** Messages per status (tab counts), every status present. */
    public Map<String, Long> countsByStatus() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status : List.of("NEW", "READ", "REPLIED", "ARCHIVED", "SPAM")) {
            counts.put(status, 0L);
        }
        jdbc.sql("select status, count(*) as count from contact_message group by status")
                .query(StatusCount.class).list().forEach(c -> counts.put(c.status(), c.count()));
        return counts;
    }

    public Optional<DetailRow> detail(UUID id) {
        return jdbc.sql("""
                        select m.id, m.name, m.email, m.company, m.topic, st.title as service_title, m.budget_range,
                               m.timeline, m.message, m.locale, m.status, m.created_at
                        from contact_message m
                        left join service_translation st on st.service_id = m.service_id and st.locale = 'pl'
                        where m.id = :id
                        """)
                .param("id", id).query(DetailRow.class).optional();
    }

    public int setStatus(UUID id, String status) {
        return jdbc.sql("update contact_message set status = :status where id = :id")
                .param("status", status).param("id", id).update();
    }

    public int delete(UUID id) {
        return jdbc.sql("delete from contact_message where id = :id").param("id", id).update();
    }
}
