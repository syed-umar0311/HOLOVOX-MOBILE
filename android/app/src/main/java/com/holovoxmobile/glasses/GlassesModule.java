package com.holovoxmobile.glasses;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.xy.bt.api.BleBaseService;
import com.xy.bt.api.BleServiceListener;
import com.xy.ksdk.api.cmd.SendManager;

/**
 * React Native bridge for the AR99 smart glasses SDK. Binds to {@link AR99GlassesService}
 * (which owns the BLE connection + protobuf session) and exposes its capabilities as a clean,
 * promise/event based API — mirroring the AR99 vendor SDK's own {@code SendManager} surface.
 */
public class GlassesModule extends ReactContextBaseJavaModule implements BleServiceListener, GlassesEventListener {

    private static final String TAG = "GlassesModule";
    private static final int AR99_SERVICE_TYPE = 2;

    @Nullable private AR99GlassesService service;
    private boolean bound = false;
    /** Source of truth for "are we actually BLE-connected to glasses" — NOT the same as `service != null`,
     *  which only means the Android service is bound. Every command must gate on this, not on binding. */
    private volatile boolean connected = false;
    @Nullable private Promise pendingConnectPromise;
    @Nullable private Promise pendingInitPromise;

    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            BleBaseService.LocalBinder localBinder = (BleBaseService.LocalBinder) binder;
            service = (AR99GlassesService) localBinder.getService();
            service.registerServiceListener(GlassesModule.this);
            service.setEventListener(GlassesModule.this);
            if (pendingInitPromise != null) {
                pendingInitPromise.resolve(null);
                pendingInitPromise = null;
            }
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            // The Android service process went away unexpectedly (not a user-initiated disconnect) —
            // the BLE link is gone with it, so reflect that immediately rather than leaving stale state.
            service = null;
            bound = false;
            boolean wasConnected = connected;
            connected = false;
            if (wasConnected) {
                WritableMap map = Arguments.createMap();
                map.putBoolean("connected", false);
                emit("GlassesConnectionChanged", map);
            }
            rejectPendingConnect("SERVICE_LOST", "Lost connection to the glasses service.");
        }
    };

    public GlassesModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "GlassesModule";
    }

    /** Called by the RN runtime when this module instance is torn down (dev reload, app shutdown). */
    @Override
    public void invalidate() {
        super.invalidate();
        if (bound) {
            try {
                if (service != null) {
                    service.unregisterServiceListener(this);
                    service.setEventListener(null);
                }
                getReactApplicationContext().unbindService(connection);
            } catch (Exception e) {
                Log.w(TAG, "invalidate(): unbind failed: " + e.getMessage());
            }
            bound = false;
        }
        service = null;
        connected = false;
        rejectPendingConnect("MODULE_TORN_DOWN", "Glasses module was torn down.");
        pendingInitPromise = null;
    }

    // ------------------------------------------------------------------------------------
    // NativeEventEmitter plumbing (required on Android even though we emit eagerly)
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void addListener(String eventName) {
    }

    @ReactMethod
    public void removeListeners(double count) {
    }

    @Override
    public void onGlassesEvent(String eventName, WritableMap params) {
        try {
            getReactApplicationContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } catch (Exception e) {
            Log.w(TAG, "Dropped event " + eventName + ": " + e.getMessage());
        }
    }

    private void emit(String eventName, WritableMap params) {
        onGlassesEvent(eventName, params);
    }

    // ------------------------------------------------------------------------------------
    // Service binding — call initialize() once (e.g. when the Glasses Control screen mounts)
    // before scan()/connect(); every other method requires the service to already be bound.
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void initialize(Promise promise) {
        if (service != null) {
            promise.resolve(null);
            return;
        }
        pendingInitPromise = promise;
        if (!bound) {
            bound = true;
            Context ctx = getReactApplicationContext();
            ctx.bindService(new Intent(ctx, AR99GlassesService.class), connection, Context.BIND_AUTO_CREATE);
        }
    }

    /** @return null if Bluetooth is on and ready to use, otherwise a human-readable reason it isn't. */
    @Nullable
    private String bluetoothUnavailableReason() {
        BluetoothManager manager =
                (BluetoothManager) getReactApplicationContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager != null ? manager.getAdapter() : null;
        if (adapter == null) {
            return "This device does not support Bluetooth.";
        }
        if (!adapter.isEnabled()) {
            return "Bluetooth is turned off. Please turn it on to search for glasses.";
        }
        return null;
    }

    @ReactMethod
    public void scan(Promise promise) {
        if (service == null) {
            promise.reject("NOT_BOUND", "Call initialize() before scan().");
            return;
        }
        String btIssue = bluetoothUnavailableReason();
        if (btIssue != null) {
            promise.reject("BLUETOOTH_DISABLED", btIssue);
            return;
        }
        try {
            service.startScan();
            promise.resolve(null);
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Bluetooth permission is required to scan for glasses.", e);
        } catch (Exception e) {
            Log.e(TAG, "scan() failed", e);
            promise.reject("SCAN_ERROR", "Could not start scanning: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopScan(Promise promise) {
        if (service != null) {
            try {
                service.cancelScan();
            } catch (Exception e) {
                Log.w(TAG, "stopScan() failed: " + e.getMessage());
            }
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void connect(String deviceId, Promise promise) {
        if (service == null) {
            promise.reject("NOT_BOUND", "Call initialize() before connect().");
            return;
        }
        if (pendingConnectPromise != null) {
            promise.reject("CONNECT_IN_PROGRESS", "A connection attempt is already in progress.");
            return;
        }
        String btIssue = bluetoothUnavailableReason();
        if (btIssue != null) {
            promise.reject("BLUETOOTH_DISABLED", btIssue);
            return;
        }
        try {
            pendingConnectPromise = promise;
            service.setServiceUUid(AR99_SERVICE_TYPE);
            service.connect(deviceId);
        } catch (SecurityException e) {
            pendingConnectPromise = null;
            promise.reject("PERMISSION_DENIED", "Bluetooth permission is required to connect.", e);
        } catch (Exception e) {
            pendingConnectPromise = null;
            Log.e(TAG, "connect() failed", e);
            promise.reject("CONNECT_ERROR", "Could not connect to the glasses: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        rejectPendingConnect("CONNECT_CANCELLED", "Connection attempt cancelled by disconnect().");
        if (service != null) {
            try {
                service.disconnect();
            } catch (Exception e) {
                Log.w(TAG, "disconnect() failed: " + e.getMessage());
            }
        }
        connected = false;
        promise.resolve(null);
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        promise.resolve(connected);
    }

    private void rejectPendingConnect(String code, String message) {
        if (pendingConnectPromise != null) {
            pendingConnectPromise.reject(code, message);
            pendingConnectPromise = null;
        }
    }

    // ------------------------------------------------------------------------------------
    // BleServiceListener — connection + scan callbacks
    // ------------------------------------------------------------------------------------

    @Override
    public void onBleConnected(BluetoothDevice device) {
        connected = true;
        WritableMap map = Arguments.createMap();
        map.putBoolean("connected", true);
        map.putString("deviceId", device != null ? device.getAddress() : null);
        emit("GlassesConnectionChanged", map);
        if (pendingConnectPromise != null) {
            pendingConnectPromise.resolve(null);
            pendingConnectPromise = null;
        }
    }

    @Override
    public void onBleDisconnect() {
        connected = false;
        WritableMap map = Arguments.createMap();
        map.putBoolean("connected", false);
        emit("GlassesConnectionChanged", map);
        rejectPendingConnect("CONNECT_FAILED", "Glasses disconnected before the connection completed.");
    }

    @Override
    public void onBleDeviceFound(String btAddress, BluetoothDevice bleDevice, short rssi, String projName, String projSN) {
        Log.i(TAG, "onBleDeviceFound RAW btAddress=" + btAddress
                + " deviceAddr=" + (bleDevice != null ? bleDevice.getAddress() : "null")
                + " deviceName=" + (bleDevice != null ? bleDevice.getName() : "null")
                + " rssi=" + rssi + " projName=" + projName + " projSN=" + projSN);
        if (bleDevice == null || bleDevice.getAddress() == null) {
            return;
        }
        // BleBaseService.startScan() is an unfiltered BLE scan — it reports every nearby BLE
        // device, not just AR99 glasses. Apply the same projName allow-list the vendor's own
        // demo app uses (Ar99SearchDeviceActivity#matchesDeviceType) so random nearby BLE
        // devices (earbuds, watches, beacons) never show up as "AR99 glasses" to connect to.
        if (!isAr99DeviceFamily(projName)) {
            return;
        }
        WritableMap map = Arguments.createMap();
        map.putString("id", bleDevice.getAddress());
        map.putString("name", bleDevice.getName());
        map.putString("projName", projName);
        map.putString("projSN", projSN);
        map.putInt("rssi", rssi);
        emit("GlassesScanResult", map);
    }

    private static boolean isAr99DeviceFamily(@Nullable String projName) {
        return projName != null
                && (projName.startsWith("AR99") || projName.startsWith("AR98") || projName.startsWith("C100"));
    }

    @Override
    public void onBleScanFinish() {
        Log.i(TAG, "onBleScanFinish");
        emit("GlassesScanFinished", Arguments.createMap());
    }

    // ------------------------------------------------------------------------------------
    // Device info / battery
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void getVersion(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetVersion());
    }

    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayDeviceInfo());
    }

    @ReactMethod
    public void getBattery(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayBattery());
    }

    // ------------------------------------------------------------------------------------
    // Display: brightness / auto-brightness / DND / head-up / wear / auto-sleep
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void getBrightness(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayBright());
    }

    @ReactMethod
    public void setBrightness(int value, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayBright(value));
    }

    @ReactMethod
    public void getAutoBrightness(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayAutoAdjustLight());
    }

    @ReactMethod
    public void setAutoBrightness(boolean enabled, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayAutoAdjustLight(enabled));
    }

    @ReactMethod
    public void getDoNotDisturb(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayDonotDisturbMode());
    }

    @ReactMethod
    public void setDoNotDisturb(boolean enabled, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayDonotDisturbMode(enabled));
    }

    @ReactMethod
    public void getHeadUpDisplay(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayHeadupScreenOn());
    }

    @ReactMethod
    public void setHeadUpDisplay(boolean enabled, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayHeadupScreenOn(enabled));
    }

    @ReactMethod
    public void getWearDetection(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayWearState());
    }

    @ReactMethod
    public void setWearDetection(boolean enabled, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayWearState(enabled));
    }

    @ReactMethod
    public void getAutoSleep(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendGetDisplayAutoSleepTime());
    }

    @ReactMethod
    public void setAutoSleep(int seconds, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayAutoSleepTime(seconds));
    }

    // ------------------------------------------------------------------------------------
    // Touch / key remote control + audio recording
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void sendKey(int keyCode, int keyAction, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlKey(keyCode, keyAction));
    }

    @ReactMethod
    public void sendClick(int clickType, int x, int y, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlClick(clickType, x, y));
    }

    @ReactMethod
    public void startAudioRecording(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlDisplayAudioRecord(true));
    }

    @ReactMethod
    public void stopAudioRecording(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlDisplayAudioRecord(false));
    }

    // ------------------------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void sendNotification(int appType, String title, String content, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendSetDisplayNotifyMessage(appType, title, content));
    }

    // ------------------------------------------------------------------------------------
    // AI assistant
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void aiDisplayStart(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendAiDisplayStart());
    }

    @ReactMethod
    public void aiDisplayStop(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendAiDisplayStop());
    }

    @ReactMethod
    public void aiDisplaySetContent(int state, String text, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendAiDisplaySetContent(state, text));
    }

    // ------------------------------------------------------------------------------------
    // Translation / transcription (both ride the Trans display channel; transcription simply
    // leaves sourceText empty, matching the vendor demo app's own usage of this channel)
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void transDisplayStart(int sourceLan, int transLan, int micSource, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendTransDisplayStart(sourceLan, transLan, micSource));
    }

    @ReactMethod
    public void transDisplaySetContent(int state, int fontSize, int sourceLan, int transLan, String sourceText, String targetText, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendTransDisplaySetContent(state, fontSize, sourceLan, transLan, sourceText, targetText));
    }

    @ReactMethod
    public void transDisplayStop(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendTransDisplayStop());
    }

    // ------------------------------------------------------------------------------------
    // Teleprompter
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void promptDisplayStart(int totalChars, int pageSpeedSec, boolean autoPage, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplayStart(totalChars, pageSpeedSec, autoPage));
    }

    @ReactMethod
    public void promptDisplaySetContent(int fontSize, int pageSpeed, int prevOffset, int curOffset, String text, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplaySetContent(fontSize, pageSpeed, prevOffset, curOffset, text));
    }

    @ReactMethod
    public void promptDisplayReplyAskContent(boolean accepted, Promise promise) {
        run(promise, () -> SendManager.getInstance().replyPromptDisplayAskContent(accepted));
    }

    @ReactMethod
    public void promptDisplayChangePage(boolean next, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplayChangePage(next));
    }

    @ReactMethod
    public void promptDisplaySetAutoTurnPage(boolean enabled, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplaySetAutoTurnPage(enabled));
    }

    @ReactMethod
    public void promptDisplaySetPageSpeed(int seconds, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplaySetPageSpeed(seconds));
    }

    @ReactMethod
    public void promptDisplayStop(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendPromptDisplayStop());
    }

    // ------------------------------------------------------------------------------------
    // Navigation
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void naviStart(int totalTimeSec, int totalDistanceM, String destination, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendNaviDisplayNaviStart(totalTimeSec, totalDistanceM, destination));
    }

    @ReactMethod
    public void naviInfoUpdate(int directionIconId, int remainTimeSec, int totalDistanceM, int remainDistanceM, int speedKmh, int currentDistanceM, String hintText, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendNaviDisplayNaviInfoUpdate(
                directionIconId, remainTimeSec, totalDistanceM, remainDistanceM, speedKmh, currentDistanceM, hintText));
    }

    @ReactMethod
    public void naviStop(Promise promise) {
        run(promise, () -> SendManager.getInstance().sendNaviDisplayNaviStop());
    }

    // ------------------------------------------------------------------------------------
    // OTA / firmware update
    // ------------------------------------------------------------------------------------

    @ReactMethod
    public void checkFirmwareUpdate(int fileType, String packageName, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlCheckNewVersion(fileType, packageName));
    }

    @ReactMethod
    public void downloadFirmwareUpdate(int fileType, String packageName, String url, Promise promise) {
        run(promise, () -> SendManager.getInstance().sendControlDownloadNewVersion(fileType, packageName, url));
    }

    // ------------------------------------------------------------------------------------

    private interface SdkCall {
        int invoke();
    }

    /**
     * Every SDK "send" call is fire-and-forget over BLE; the actual answer arrives later as an event.
     * Gates on {@link #connected} (real BLE link state from onBleConnected/onBleDisconnect), not on
     * whether the Android service is merely bound — those are not the same thing.
     */
    private void run(Promise promise, SdkCall call) {
        if (!connected || service == null) {
            promise.reject("NOT_CONNECTED", "Glasses are not connected.");
            return;
        }
        try {
            call.invoke();
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "SDK call failed", e);
            promise.reject("SDK_ERROR", "Command failed: " + e.getMessage(), e);
        }
    }
}
