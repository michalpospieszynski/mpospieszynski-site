package pl.mpospieszynski.site.contact.infra;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Contact messages and the few lookups the form needs (active services, auto-reply texts). */
@Repository
public class ContactStore {

    /** A validated message ready to be stored. */
    public record NewMessage(String locale, String topic, String name, String email, String company, UUID serviceId,
                             String budgetRange, String timeline, String message, String ipHash) {
    }

    /** The stored message as the notification needs it, with the service title in Polish. */
    public record StoredMessage(UUID id, String locale, String topic, String name, String email, String company,
                                String serviceTitle, String budgetRange, String timeline, String message,
                                OffsetDateTime createdAt) {
    }

    public record AutoReply(String subject, String bodyMd) {
    }

    private final JdbcClient jdbc;

    public ContactStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID insert(NewMessage m) {
        return jdbc.sql("""
                        insert into contact_message
                            (locale, topic, name, email, company, service_id, budget_range, timeline, message, ip_hash)
                        values (:locale, :topic, :name, :email, :company, :serviceId, :budget, :timeline, :message, :ipHash)
                        returning id
                        """)
                .param("locale", m.locale())
                .param("topic", m.topic())
                .param("name", m.name())
                .param("email", m.email())
                .param("company", m.company())
                .param("serviceId", m.serviceId())
                .param("budget", m.budgetRange())
                .param("timeline", m.timeline())
                .param("message", m.message())
                .param("ipHash", m.ipHash())
                .query(UUID.class)
                .single();
    }

    public Optional<StoredMessage> find(UUID id) {
        return jdbc.sql("""
                        select m.id, m.locale, m.topic, m.name, m.email, m.company, st.title as service_title,
                               m.budget_range, m.timeline, m.message, m.created_at
                        from contact_message m
                        left join service_translation st on st.service_id = m.service_id and st.locale = 'pl'
                        where m.id = :id
                        """)
                .param("id", id)
                .query(StoredMessage.class)
                .optional();
    }

    public boolean isActiveService(UUID serviceId) {
        return jdbc.sql("select exists (select 1 from service_offering where id = :id and active)")
                .param("id", serviceId)
                .query(Boolean.class)
                .single();
    }

    /** The auto-reply in `locale`, else Polish; empty when the settings have none. */
    public Optional<AutoReply> autoReply(String locale) {
        return jdbc.sql("""
                        select autoreply_subject as subject, autoreply_body_md as body_md
                        from site_settings_translation
                        where settings_id = 1 and locale in (:locale, 'pl')
                          and autoreply_subject is not null and autoreply_body_md is not null
                        order by case when locale = :locale then 0 else 1 end
                        limit 1
                        """)
                .param("locale", locale)
                .query(AutoReply.class)
                .optional();
    }

    public int deleteOlderThan(OffsetDateTime cutoff) {
        return jdbc.sql("delete from contact_message where created_at < :cutoff")
                .param("cutoff", cutoff)
                .update();
    }
}
