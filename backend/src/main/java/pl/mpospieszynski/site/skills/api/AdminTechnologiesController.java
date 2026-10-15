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
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.AdminTechnology;
import pl.mpospieszynski.site.skills.domain.SkillsAdmin.TechnologyInput;
import pl.mpospieszynski.site.skills.domain.SkillsAdminService;

/** Admin technologies (docs/screens/admin/07-skills.md); also the project editor's picker and inline creation. */
@RestController
@RequestMapping("/api/v1/admin/technologies")
class AdminTechnologiesController {

    record TechnologyOrderRequest(List<UUID> ids) {
    }

    private final SkillsAdminService skills;

    AdminTechnologiesController(SkillsAdminService skills) {
        this.skills = skills;
    }

    @Operation(operationId = "listAdminTechnologies")
    @GetMapping
    List<AdminTechnology> list() {
        return skills.listTechnologies();
    }

    @Operation(operationId = "createAdminTechnology", summary = "Create; only the name is required (category TOOLING)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AdminTechnology create(@RequestBody TechnologyInput input) {
        return skills.createTechnology(input);
    }

    @Operation(operationId = "saveAdminTechnology")
    @PutMapping("/{id}")
    AdminTechnology save(@PathVariable UUID id, @RequestBody TechnologyInput input) {
        return skills.saveTechnology(id, input);
    }

    @Operation(operationId = "deleteAdminTechnology", summary = "409 with the project count while it is used")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        skills.deleteTechnology(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "reorderAdminTechnologies", summary = "Order within one category")
    @PutMapping("/order")
    ResponseEntity<Void> reorder(@RequestBody TechnologyOrderRequest request) {
        skills.reorderTechnologies(request.ids() == null ? List.of() : request.ids());
        return ResponseEntity.noContent().build();
    }
}
