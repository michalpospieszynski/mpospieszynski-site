package pl.mpospieszynski.site.skills.infra;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Read queries over technologies for the public pages. */
@Repository
public class PublicTechnologyQueries {

    public record UsedTechnologyRow(String slug, String name, String category, int projectCount) {
    }

    private final JdbcClient jdbc;

    public PublicTechnologyQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Technologies of at least one published project, with how many published projects use each. */
    public List<UsedTechnologyRow> usedByPublishedProjects() {
        return jdbc.sql("""
                        select te.slug, te.name, te.category, count(*) as project_count
                        from technology te
                        join project_technology pt on pt.technology_id = te.id
                        join project p on p.id = pt.project_id and p.status = 'PUBLISHED'
                        group by te.id, te.slug, te.name, te.category, te.sort_order
                        order by te.name
                        """)
                .query(UsedTechnologyRow.class)
                .list();
    }
}
