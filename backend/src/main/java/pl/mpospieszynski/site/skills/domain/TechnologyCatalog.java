package pl.mpospieszynski.site.skills.domain;

import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.mpospieszynski.site.skills.infra.PublicTechnologyQueries;
import pl.mpospieszynski.site.skills.infra.PublicTechnologyQueries.UsedTechnologyRow;

/** Technologies for the public project filter (docs/screens/public/03-projects-list.md, Data). */
@Service
public class TechnologyCatalog {

    static final String USED_CACHE = "public-technologies";

    public record UsedTechnology(String slug, String name, String category, int projectCount) {
    }

    private final PublicTechnologyQueries queries;

    public TechnologyCatalog(PublicTechnologyQueries queries) {
        this.queries = queries;
    }

    /** Names and categories are not translated, so one cached list serves both languages. */
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = USED_CACHE, key = "'all'")
    public List<UsedTechnology> usedByPublishedProjects() {
        return queries.usedByPublishedProjects().stream().map(TechnologyCatalog::toDomain).toList();
    }

    private static UsedTechnology toDomain(UsedTechnologyRow row) {
        return new UsedTechnology(row.slug(), row.name(), row.category(), row.projectCount());
    }
}
