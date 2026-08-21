package com.holovoxmobile.glasses;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.google.protobuf.MessageLite;
import com.xy.bt.api.BleBaseService;
import com.xy.ksdk.api.cmd.DealManager;
import com.xy.ksdk.api.cmd.SendManager;
import com.xy.ksdk.prot.XyCmdListener;
import com.xy.ksdk.protos.XyAi;
import com.xy.ksdk.protos.XyBase;
import com.xy.ksdk.protos.XyComm;
import com.xy.ksdk.protos.XyCommDisplay;
import com.xy.ksdk.protos.XyNavi;
import com.xy.ksdk.protos.XyPrompt;
import com.xy.ksdk.protos.XyTrans;

/**
 * Owns the AR99 SDK (SmartXY / ksdk) session: BLE connection lifecycle (inherited from
 * {@link BleBaseService}) plus the protobuf command/response/notify channel (wired up here).
 *
 * The React Native {@code GlassesModule} binds to this service the same way the vendor's own
 * demo app's activities bind to their {@code BleService}, and registers itself as the
 * {@link GlassesEventListener} to receive decoded SDK events as they arrive.
 */
public class AR99GlassesService extends BleBaseService implements XyCmdListener {

    private static final String TAG = "AR99GlassesService";

    @Nullable
    private GlassesEventListener eventListener;

    public void setEventListener(@Nullable GlassesEventListener listener) {
        this.eventListener = listener;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SendManager.getInstance().init(this);
        DealManager.getInstance().init(this);
        DealManager.getInstance().registerRecvCmdListener(this);
    }

    @Override
    public void onDestroy() {
        SendManager.getInstance().destroy();
        super.onDestroy();
    }

    /** Feeds bytes received over the BLE control channel into the SDK's protobuf parser. */
    @Override
    protected void onBleRecvData(byte[] data) {
        if (data != null && data.length > 0) {
            DealManager.getInstance().onReceive(data, data.length);
        }
    }

    private void emit(String eventName, WritableMap params) {
        GlassesEventListener listener = this.eventListener;
        if (listener != null) {
            listener.onGlassesEvent(eventName, params);
        }
    }

    // ------------------------------------------------------------------------------------
    // XyCmdListener — classic CMD_COMM channel (device info / battery / version / wear / etc.)
    // ------------------------------------------------------------------------------------

    @Override
    public void handleCommMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (payload instanceof XyComm.GetVersionResponse) {
                XyComm.GetVersionResponse resp = (XyComm.GetVersionResponse) payload;
                WritableMap map = Arguments.createMap();
                map.putBoolean("success", resp.getSuccess());
                map.putString("mcu1", resp.getVersionMcu1());
                map.putString("mcu2", resp.getVersionMcu2());
                map.putString("android", resp.getVersionAndroid());
                map.putString("app", resp.getVersionApp());
                emit("GlassesVersionInfo", map);
            } else if (payload instanceof XyComm.GetBatteryInfoResponse) {
                XyComm.GetBatteryInfoResponse resp = (XyComm.GetBatteryInfoResponse) payload;
                emitBattery(resp.getSuccess(), (int) resp.getBatteryLevel(), resp.getIsCharging());
            } else if (payload instanceof XyComm.NotifyBatteryChange) {
                XyComm.NotifyBatteryChange notify = (XyComm.NotifyBatteryChange) payload;
                emitBattery(true, (int) notify.getBatteryLevel(), notify.getIsCharging());
            } else if (payload instanceof XyComm.GetWearStateResponse) {
                XyComm.GetWearStateResponse resp = (XyComm.GetWearStateResponse) payload;
                emitBoolState("GlassesWearStateChanged", "worn", resp.getSuccess(), resp.getIsWorn());
            } else if (payload instanceof XyComm.NotifyTouchpanelEvent) {
                XyComm.NotifyTouchpanelEvent notify = (XyComm.NotifyTouchpanelEvent) payload;
                WritableMap map = Arguments.createMap();
                map.putInt("eventType", notify.getEventType());
                map.putInt("x", notify.getX());
                map.putInt("y", notify.getY());
                emit("GlassesTouchEvent", map);
            } else if (payload instanceof XyComm.NotifyKeyEvent) {
                XyComm.NotifyKeyEvent notify = (XyComm.NotifyKeyEvent) payload;
                WritableMap map = Arguments.createMap();
                map.putInt("keyCode", notify.getKeyCode());
                map.putInt("eventType", notify.getEventType());
                emit("GlassesKeyEvent", map);
            } else if (payload instanceof XyComm.NotifyBesOtaUpdate) {
                XyComm.NotifyBesOtaUpdate notify = (XyComm.NotifyBesOtaUpdate) payload;
                WritableMap map = Arguments.createMap();
                map.putString("channel", "bes");
                map.putString("type", notify.getType());
                map.putInt("progress", notify.getProgress());
                emit("GlassesOtaProgress", map);
            } else if (payload instanceof XyComm.NotifyAndroidOtaUpdate) {
                XyComm.NotifyAndroidOtaUpdate notify = (XyComm.NotifyAndroidOtaUpdate) payload;
                WritableMap map = Arguments.createMap();
                map.putString("channel", "android");
                map.putString("type", notify.getCmd());
                map.putString("message", notify.getMsg());
                emit("GlassesOtaProgress", map);
            } else if (payload instanceof XyComm.ControlCheckNewVersionResponse) {
                XyComm.ControlCheckNewVersionResponse resp = (XyComm.ControlCheckNewVersionResponse) payload;
                WritableMap map = Arguments.createMap();
                map.putBoolean("success", resp.getSuccess());
                map.putInt("state", resp.getState());
                map.putString("packageName", resp.getPackageName());
                map.putString("currentVersion", resp.getCurrentVersion());
                map.putString("newestVersion", resp.getNewestVersion());
                emit("GlassesFirmwareCheckResult", map);
            } else if (payload instanceof XyComm.ControlDownloadNewVersionResponse) {
                XyComm.ControlDownloadNewVersionResponse resp = (XyComm.ControlDownloadNewVersionResponse) payload;
                WritableMap map = Arguments.createMap();
                map.putString("channel", "download");
                map.putBoolean("success", resp.getSuccess());
                map.putInt("progress", resp.getProgress());
                map.putString("message", resp.getMessage());
                emit("GlassesOtaProgress", map);
            }
        } catch (Exception e) {
            Log.e(TAG, "handleCommMessage", e);
        }
    }

    /** AR99 reports device info / battery / brightness / DND / headup / wear / auto-sleep over the Display channel. */
    @Override
    public void handleDisplayMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (payload instanceof XyCommDisplay.GetDisplayBatteryResponse) {
                XyCommDisplay.GetDisplayBatteryResponse resp = (XyCommDisplay.GetDisplayBatteryResponse) payload;
                emitBattery(resp.getSuccess(), resp.getBattery(), resp.getIsCharge());
            } else if (payload instanceof XyCommDisplay.GetDisplayBrightResponse) {
                XyCommDisplay.GetDisplayBrightResponse resp = (XyCommDisplay.GetDisplayBrightResponse) payload;
                emitIntState("GlassesBrightnessChanged", "value", resp.getSuccess(), (int) resp.getBright());
            } else if (payload instanceof XyCommDisplay.SetDisplayBrightResponse) {
                XyCommDisplay.SetDisplayBrightResponse resp = (XyCommDisplay.SetDisplayBrightResponse) payload;
                emitIntState("GlassesBrightnessChanged", "value", resp.getSuccess(), (int) resp.getBright());
            } else if (payload instanceof XyCommDisplay.GetDisplayAutoAdjustLightResponse) {
                XyCommDisplay.GetDisplayAutoAdjustLightResponse resp = (XyCommDisplay.GetDisplayAutoAdjustLightResponse) payload;
                emitBoolState("GlassesAutoBrightnessChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.SetDisplayAutoAdjustLightResponse) {
                XyCommDisplay.SetDisplayAutoAdjustLightResponse resp = (XyCommDisplay.SetDisplayAutoAdjustLightResponse) payload;
                emitBoolState("GlassesAutoBrightnessChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.GetDisplayDonotDisturbModeResponse) {
                XyCommDisplay.GetDisplayDonotDisturbModeResponse resp = (XyCommDisplay.GetDisplayDonotDisturbModeResponse) payload;
                emitBoolState("GlassesDoNotDisturbChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.SetDisplayDonotDisturbModeResponse) {
                XyCommDisplay.SetDisplayDonotDisturbModeResponse resp = (XyCommDisplay.SetDisplayDonotDisturbModeResponse) payload;
                emitBoolState("GlassesDoNotDisturbChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.GetDisplayHeadupScreenOnResponse) {
                XyCommDisplay.GetDisplayHeadupScreenOnResponse resp = (XyCommDisplay.GetDisplayHeadupScreenOnResponse) payload;
                emitBoolState("GlassesHeadUpChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.SetDisplayHeadupScreenOnResponse) {
                XyCommDisplay.SetDisplayHeadupScreenOnResponse resp = (XyCommDisplay.SetDisplayHeadupScreenOnResponse) payload;
                emitBoolState("GlassesHeadUpChanged", "enabled", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.GetDisplayWearStateResponse) {
                XyCommDisplay.GetDisplayWearStateResponse resp = (XyCommDisplay.GetDisplayWearStateResponse) payload;
                emitBoolState("GlassesWearStateChanged", "worn", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.SetDisplayWearStateResponse) {
                XyCommDisplay.SetDisplayWearStateResponse resp = (XyCommDisplay.SetDisplayWearStateResponse) payload;
                emitBoolState("GlassesWearStateChanged", "worn", resp.getSuccess(), resp.getEnable());
            } else if (payload instanceof XyCommDisplay.GetDisplayAutoSleepTimeResponse) {
                XyCommDisplay.GetDisplayAutoSleepTimeResponse resp = (XyCommDisplay.GetDisplayAutoSleepTimeResponse) payload;
                emitIntState("GlassesAutoSleepChanged", "seconds", resp.getSuccess(), (int) resp.getSleepTime());
            } else if (payload instanceof XyCommDisplay.SetDisplayAutoSleepTimeResponse) {
                XyCommDisplay.SetDisplayAutoSleepTimeResponse resp = (XyCommDisplay.SetDisplayAutoSleepTimeResponse) payload;
                emitIntState("GlassesAutoSleepChanged", "seconds", resp.getSuccess(), (int) resp.getSleepTime());
            } else if (payload instanceof XyCommDisplay.GetDisplayDeviceResponse) {
                XyCommDisplay.GetDisplayDeviceResponse resp = (XyCommDisplay.GetDisplayDeviceResponse) payload;
                WritableMap map = Arguments.createMap();
                map.putBoolean("success", resp.getSuccess());
                map.putString("productName", resp.getProductName());
                map.putString("serialNo", resp.getSerialNo());
                map.putString("btMac", resp.getBtMac());
                map.putString("version", resp.getVersion());
                map.putString("firmware", resp.getFirmware());
                emit("GlassesDeviceInfo", map);
            } else if (payload instanceof XyCommDisplay.ControlDisplayAudioRecordResponse) {
                XyCommDisplay.ControlDisplayAudioRecordResponse resp = (XyCommDisplay.ControlDisplayAudioRecordResponse) payload;
                // proto: start=false means recording just began, start=true means it stopped
                emitBoolState("GlassesAudioRecordChanged", "recording", resp.getSuccess(), !resp.getStart());
            } else if (payload instanceof XyCommDisplay.ControlDisplayFactoryResetResponse) {
                XyCommDisplay.ControlDisplayFactoryResetResponse resp = (XyCommDisplay.ControlDisplayFactoryResetResponse) payload;
                WritableMap map = Arguments.createMap();
                map.putBoolean("success", resp.getSuccess());
                emit("GlassesFactoryResetResult", map);
            }
        } catch (Exception e) {
            Log.e(TAG, "handleDisplayMessage", e);
        }
    }

    @Override
    public void handleAiMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (!isResponse && payload instanceof XyAi.AiDisplayStartRequest) {
                emitFromDevice("GlassesAiRequestFromDevice", "start");
            } else if (!isResponse && payload instanceof XyAi.AiDisplayStopRequest) {
                emitFromDevice("GlassesAiRequestFromDevice", "stop");
            } else if (payload instanceof XyAi.AiDisplayStartResponse) {
                emitResult("GlassesAiDisplayResult", "start", ((XyAi.AiDisplayStartResponse) payload).getSuccess());
            } else if (payload instanceof XyAi.AiDisplayStopResponse) {
                emitResult("GlassesAiDisplayResult", "stop", ((XyAi.AiDisplayStopResponse) payload).getSuccess());
            } else if (payload instanceof XyAi.AiDisplaySetContentResponse) {
                emitResult("GlassesAiDisplayResult", "setContent", ((XyAi.AiDisplaySetContentResponse) payload).getSuccess());
            }
        } catch (Exception e) {
            Log.e(TAG, "handleAiMessage", e);
        }
    }

    @Override
    public void handleTransMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (!isResponse && payload instanceof XyTrans.TransDisplayStopRequest) {
                SendManager.getInstance().replyTransDisplayStop(true);
                emitFromDevice("GlassesTransRequestFromDevice", "stop");
            } else if (payload instanceof XyTrans.TransDisplayStartResponse) {
                emitResult("GlassesTransDisplayResult", "start", ((XyTrans.TransDisplayStartResponse) payload).getSuccess());
            } else if (payload instanceof XyTrans.TransDisplaySetContentResponse) {
                emitResult("GlassesTransDisplayResult", "setContent", ((XyTrans.TransDisplaySetContentResponse) payload).getSuccess());
            }
        } catch (Exception e) {
            Log.e(TAG, "handleTransMessage", e);
        }
    }

    @Override
    public void handlePromptMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (!isResponse && payload instanceof XyPrompt.PromptDisplayStopRequest) {
                SendManager.getInstance().replyPromptDisplayStop(true);
                emitFromDevice("GlassesPromptRequestFromDevice", "stop");
            } else if (isResponse && payload instanceof XyPrompt.PromptDisplayStartResponse) {
                emitResult("GlassesPromptDisplayResult", "start", ((XyPrompt.PromptDisplayStartResponse) payload).getSuccess());
            } else if (isResponse && payload instanceof XyPrompt.PromptDisplaySetContentResponse) {
                emitResult("GlassesPromptDisplayResult", "setContent", ((XyPrompt.PromptDisplaySetContentResponse) payload).getSuccess());
            } else if (!isResponse && payload instanceof XyPrompt.PromptDisplayAskContentRequest) {
                XyPrompt.PromptDisplayAskContentRequest req = (XyPrompt.PromptDisplayAskContentRequest) payload;
                WritableMap map = Arguments.createMap();
                map.putString("type", "askContent");
                map.putBoolean("nextPage", req.getNextPage());
                map.putInt("offset", req.getOffset());
                map.putInt("length", req.getLength());
                emit("GlassesPromptRequestFromDevice", map);
            }
        } catch (Exception e) {
            Log.e(TAG, "handlePromptMessage", e);
        }
    }

    @Override
    public void handleNaviMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
        try {
            if (!isResponse && payload instanceof XyNavi.NaviDisplayNaviStopRequest) {
                SendManager.getInstance().replyNaviDisplayNaviStop(true);
                emitFromDevice("GlassesNaviRequestFromDevice", "stop");
            }
        } catch (Exception e) {
            Log.e(TAG, "handleNaviMessage", e);
        }
    }

    // Channels the SDK exposes but this integration does not surface to React Native
    // (file transfer, text viewer, and low-level chip/factory diagnostics).
    @Override
    public void handleFileMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
    }

    @Override
    public void handleMtkBesMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
    }

    @Override
    public void handleMtkAtsMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
    }

    @Override
    public void handleBesAtsMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
    }

    @Override
    public void handleFactoryTestMessage(XyBase.MessageHeader header, MessageLite payload, boolean isResponse) {
    }

    @Override
    public void onError(int code, String message) {
        WritableMap map = Arguments.createMap();
        map.putInt("code", code);
        map.putString("message", message);
        emit("GlassesError", map);
    }

    // ------------------------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------------------------

    private void emitBattery(boolean success, int level, boolean charging) {
        WritableMap map = Arguments.createMap();
        map.putBoolean("success", success);
        map.putInt("level", level);
        map.putBoolean("charging", charging);
        emit("GlassesBatteryChanged", map);
    }

    private void emitBoolState(String eventName, String key, boolean success, boolean value) {
        WritableMap map = Arguments.createMap();
        map.putBoolean("success", success);
        map.putBoolean(key, value);
        emit(eventName, map);
    }

    private void emitIntState(String eventName, String key, boolean success, int value) {
        WritableMap map = Arguments.createMap();
        map.putBoolean("success", success);
        map.putInt(key, value);
        emit(eventName, map);
    }

    private void emitResult(String eventName, String type, boolean success) {
        WritableMap map = Arguments.createMap();
        map.putString("type", type);
        map.putBoolean("success", success);
        emit(eventName, map);
    }

    private void emitFromDevice(String eventName, String type) {
        WritableMap map = Arguments.createMap();
        map.putString("type", type);
        emit(eventName, map);
    }
}
