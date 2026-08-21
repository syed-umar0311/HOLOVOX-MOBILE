package com.holovoxmobile.glasses;

import com.facebook.react.bridge.WritableMap;

/**
 * Bridges decoded AR99 SDK callbacks out of {@link AR99GlassesService} to whichever
 * React Native module instance is currently bound to it.
 */
public interface GlassesEventListener {
    void onGlassesEvent(String eventName, WritableMap params);
}
