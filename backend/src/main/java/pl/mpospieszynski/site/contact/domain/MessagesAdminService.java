package pl.mpospieszynski.site.contact.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.contact.infra.AdminMessageQueries;
import pl.mpospieszynski.site.contact.infra.AdminMessageQueries.DetailRow;
import pl.mpospieszynski.site.shared.web.NotFoundException;
import pl.mpospieszynski.site.shared.web.ValidationException;

/** The admin inbox (docs/screens/admin/04-messages.md). Opening a new message marks it read. */
@Service
public class MessagesAdminService {

    public static final Set<String> STATUSES = Set.of("NEW", "READ", "REPLIED", "ARCHIVED", "SPAM");

    public record MessageListItem(UUID id, String name, String email, String company, String topic, String serviceTitle,
                                  String locale, String status, String preview, OffsetDateTime createdAt) {
    }

    public record MessagePage(List<MessageListItem> items, long total, int page, int size, Map<String, Long> counts) {
    }

    public record MessageDetail(UUID id, String name, String email, String company, String topic, String serviceTitle,
                                String budgetRange, String timeline, String message, String locale, String status,
                                OffsetDateTime createdAt) {
    }

    private final AdminMessageQueries queries;

    public MessagesAdminService(AdminMessageQueries queries) {
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    public MessagePage page(String status, String q, int page, int size) {
        String filter = status == null || status.isBlank() ? null : checkStatus(status);
        String search = q == null ? "" : q.strip();
        int pageSize = Math.clamp(size, 1, 100);
        int pageIndex = Math.max(page, 0);
        List<MessageListItem> items = queries.page(filter, search, pageIndex, pageSize).stream()
                .map(r -> new MessageListItem(r.id(), r.name(), r.email(), r.company(), r.topic(), r.serviceTitle(),
                        r.locale(), r.status(), r.preview(), r.createdAt()))
                .toList();
        return new MessagePage(items, queries.count(filter, search), pageIndex, pageSize, queries.countsByStatus());
    }

    @Transactional
    public MessageDetail open(UUID id) {
        DetailRow row = queries.detail(id).orElseThrow(NotFoundException::new);
        String status = row.status();
        if ("NEW".equals(status)) {
            queries.setStatus(id, "READ");
            status = "READ";
        }
        return new MessageDetail(row.id(), row.name(), row.email(), row.company(), row.topic(), row.serviceTitle(),
                row.budgetRange(), row.timeline(), row.message(), row.locale(), status, row.createdAt());
    }

    @Transactional
    public void setStatus(UUID id, String status) {
        if (queries.setStatus(id, checkStatus(status)) == 0) {
            throw new NotFoundException();
        }
    }

    @Transactional
    public void delete(UUID id) {
        if (queries.delete(id) == 0) {
            throw new NotFoundException();
        }
    }

    /** Dashboard figures. */
    @Transactional(readOnly = true)
    public long newCount() {
        return queries.countsByStatus().getOrDefault("NEW", 0L);
    }

    @Transactional(readOnly = true)
    public List<MessageListItem> recent(int limit) {
        return page(null, "", 0, limit).items();
    }

    private static String checkStatus(String status) {
        if (!STATUSES.contains(status)) {
            throw new ValidationException("status", "admin.errors.required");
        }
        return status;
    }
}
