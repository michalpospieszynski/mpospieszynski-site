package pl.mpospieszynski.site.skills.infra;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.skills.domain.ExpertiseArea;

public interface ExpertiseAreaRepository extends JpaRepository<ExpertiseArea, UUID> {

    @Query("select coalesce(max(a.sortOrder), 0) from ExpertiseArea a")
    int maxSortOrder();
}
