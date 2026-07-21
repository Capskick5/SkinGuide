// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

package mss.orderservice.service.impl;

import mss.orderservice.model.Cart;
import mss.orderservice.repository.CartRepository;
import mss.orderservice.service.ICartService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CartService implements ICartService {

    private final CartRepository cartRepository;

    public CartService(CartRepository cartRepository) {
        this.cartRepository = cartRepository;
    }

    @Override
    public List<Map<String, Object>> get(String userId) {
        return cartRepository.findByUserId(userId)
                .map(Cart::getItems)
                .orElseGet(ArrayList::new);
    }

    @Override
    public List<Map<String, Object>> replace(String userId, List<Map<String, Object>> items) {
        List<Map<String, Object>> safeItems = items != null ? items : new ArrayList<>();
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> Cart.builder().userId(userId).build());
        cart.setItems(safeItems);
        cart.setUpdatedAt(Instant.now());
        return cartRepository.save(cart).getItems();
    }

    @Override
    public void clear(String userId) {
        cartRepository.deleteByUserId(userId);
    }
}
