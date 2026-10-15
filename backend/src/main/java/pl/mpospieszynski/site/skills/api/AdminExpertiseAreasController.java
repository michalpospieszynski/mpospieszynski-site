package pl.mpospieszynski.site.skills.api;

import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AdminExpertiseArea;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AreaInput;
import pl.mpospieszynski.site.skills.domain.SkillsAdminService;

/** Admin expertise areas (docs/screens/admin/07-skills.md). */
@RestController
@RequestMapping("/api/v1/admin/expertise-areas")
class AdminExpertiseAreasController {

    record AreaOrderRequest(List<UUID> ids) {
    }

    private final SkillsAdminService skills;

    AdminExpertiseAreasController(SkillsAdminService skills) {
        this.skills = skills;
    }

    @Operation(operationId = "listAdminExpertiseAreas")
    @GetMapping
    List<AdminExpertiseArea> list() {
        return skills.listAreas();
    }

    @Operation(operationId = "createAdminExpertiseArea")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AdminExpertiseArea create(@RequestBody AreaInput input) {
        return skills.createArea(input);
    }

    @Operation(operationId = "saveAdminExpertiseArea")
    @PutMapping("/{id}")
    AdminExpertiseArea save(@PathVariable UUID id, @RequestBody AreaInput input) {
        return skills.saveArea(id, input);
    }

    @Operation(operationId = "deleteAdminExpertiseArea")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        skills.deleteArea(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "reorderAdminExpertiseAreas")
    @PutMapping("/order")
    ResponseEntity<Void> reorder(@RequestBody AreaOrderRequest request) {
        skills.reorderAreas(request.ids() == null ? List.of() : request.ids());
        return ResponseEntity.noContent().build();
    }
}
