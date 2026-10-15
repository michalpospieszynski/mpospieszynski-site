package pl.mpospieszynski.site.skills.infra;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.skills.domain.Technology;

public interface TechnologyRepository extends JpaRepository<Technology, UUID> {

    Optional<Technology> findBySlug(String slug);

    Optional<Technology> findByNameIgnoreCase(String name);

    @Query("select coalesce(max(t.sortOrder), 0) from Technology t")
    int maxSortOrder();
}
