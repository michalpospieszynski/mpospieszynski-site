package pl.mpospieszynski.site.projects.infra;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.projects.domain.Project;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    @Query("select coalesce(max(p.sortOrder), 0) from Project p")
    int maxSortOrder();
}
