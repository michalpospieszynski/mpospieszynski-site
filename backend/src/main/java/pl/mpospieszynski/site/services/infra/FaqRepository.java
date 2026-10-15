package pl.mpospieszynski.site.services.infra;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.services.domain.Faq;

public interface FaqRepository extends JpaRepository<Faq, UUID> {

    @Query("select coalesce(max(f.sortOrder), 0) from Faq f")
    int maxSortOrder();
}
