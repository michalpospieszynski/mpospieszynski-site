package pl.mpospieszynski.site.services.infra;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pl.mpospieszynski.site.services.domain.ServiceOffering;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, UUID> {

    @Query("select coalesce(max(s.sortOrder), 0) from ServiceOffering s")
    int maxSortOrder();

    @Query(value = "select count(*) from contact_message where service_id = :id", nativeQuery = true)
    long messageCount(UUID id);
}
