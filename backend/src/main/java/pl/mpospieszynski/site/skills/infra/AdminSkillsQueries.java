package pl.mpospieszynski.site.skills.infra;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** SQL for the admin skills screen: usage counts, area links and existence checks. */
@Repository
public class AdminSkillsQueries {

    private record Count(UUID id, long count) {
    }

    private final JdbcClient jdbc;

    public AdminSkillsQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Projects (any status) per technology. */
    public Map<UUID, Long> projectCounts() {
        return jdbc.sql("select technology_id as id, count(*) as count from project_technology group by technology_id")
                .query(Count.class).list().stream().collect(Collectors.toMap(Count::id, Count::count));
    }

    public long projectCount(UUID technologyId) {
        return jdbc.sql("select count(*) from project_technology where technology_id = :id")
                .param("id", technologyId).query(Long.class).single();
    }

    public List<UUID> areaTechnologies(UUID areaId) {
        return jdbc.sql("select technology_id from expertise_area_technology where area_id = :id order by sort_order")
                .param("id", areaId).query(UUID.class).list();
    }

    public List<UUID> areaProjects(UUID areaId) {
        return jdbc.sql("""
                        select ap.project_id from expertise_area_project ap join project p on p.id = ap.project_id
                        where ap.area_id = :id order by p.sort_order
                        """)
                .param("id", areaId).query(UUID.class).list();
    }

    public void replaceAreaLinks(UUID areaId, List<UUID> technologies, List<UUID> projects) {
        jdbc.sql("delete from expertise_area_technology where area_id = :id").param("id", areaId).update();
        jdbc.sql("delete from expertise_area_project where area_id = :id").param("id", areaId).update();
        for (int i = 0; i < technologies.size(); i++) {
            jdbc.sql("insert into expertise_area_technology (area_id, technology_id, sort_order) values (:a, :t, :o)")
                    .param("a", areaId).param("t", technologies.get(i)).param("o", (i + 1) * 10).update();
        }
        for (UUID project : projects) {
            jdbc.sql("insert into expertise_area_project (area_id, project_id) values (:a, :p)")
                    .param("a", areaId).param("p", project).update();
        }
    }

    public long countExisting(String table, Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return 0;
        }
        String sql = switch (table) {
            case "technology", "project" -> "select count(*) from " + table + " where id in (:ids)";
            default -> throw new IllegalArgumentException(table);
        };
        return jdbc.sql(sql).param("ids", ids).query(Long.class).single();
    }
}
