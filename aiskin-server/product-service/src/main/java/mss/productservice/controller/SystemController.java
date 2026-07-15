package mss.productservice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products/system")
public class SystemController {

    private final RequestMappingHandlerMapping handlerMapping;

    public SystemController(
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @GetMapping("/endpoints")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, String>> getEndpoints() {
        List<Map<String, String>> endpoints = new ArrayList<>();
        handlerMapping.getHandlerMethods().forEach((info, method) -> {
            if (info.getMethodsCondition().getMethods().isEmpty()) return;
            
            String reqMethod = info.getMethodsCondition().getMethods().iterator().next().name();
            
            if (info.getPatternValues() != null && !info.getPatternValues().isEmpty()) {
                String path = info.getPatternValues().iterator().next();
                Map<String, String> ep = new HashMap<>();
                ep.put("method", reqMethod);
                ep.put("path", path);
                endpoints.add(ep);
            }
        });
        return endpoints;
    }
}
