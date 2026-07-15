package mss.userservice.controller;

import mss.userservice.dto.SyncEndpointsRequest.EndpointDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/users/system")
public class SystemController {

    private final RequestMappingHandlerMapping handlerMapping;

    public SystemController(RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @GetMapping("/endpoints")
    @PreAuthorize("hasRole('ADMIN')")
    public List<EndpointDto> getEndpoints() {
        List<EndpointDto> endpoints = new ArrayList<>();
        handlerMapping.getHandlerMethods().forEach((info, method) -> {
            if (info.getMethodsCondition().getMethods().isEmpty()) return;
            
            String reqMethod = info.getMethodsCondition().getMethods().iterator().next().name();
            
            if (info.getPatternValues() != null && !info.getPatternValues().isEmpty()) {
                String path = info.getPatternValues().iterator().next();
                endpoints.add(new EndpointDto(reqMethod, path));
            }
        });
        return endpoints;
    }
}
