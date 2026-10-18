package com.geracollante.odin;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Puente entre el juego (JavaScript) y Google Nearby Connections:
 * conecta celulares cercanos por Bluetooth y WiFi directo, sin internet.
 * El anfitrión anuncia la sala y los invitados la buscan y se conectan (topología estrella).
 */
@CapacitorPlugin(
    name = "OdinNearby",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(alias = "wifi", strings = { Manifest.permission.NEARBY_WIFI_DEVICES })
    }
)
public class OdinNearbyPlugin extends Plugin {

    private static final String SERVICE_ID = "com.geracollante.odin.v1";
    private ConnectionsClient client;
    private final Set<String> connected = new HashSet<>();

    @Override
    public void load() {
        client = Nearby.getConnectionsClient(getContext());
    }

    // ---------- permisos según la versión de Android ----------

    private String[] neededAliases() {
        List<String> aliases = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) aliases.add("bluetooth");
        if (Build.VERSION.SDK_INT >= 33) aliases.add("wifi");
        else aliases.add("location");
        return aliases.toArray(new String[0]);
    }

    private boolean allGranted() {
        for (String alias : neededAliases()) {
            if (getPermissionState(alias) != PermissionState.GRANTED) return false;
        }
        return true;
    }

    @PluginMethod
    public void requestPerms(PluginCall call) {
        if (allGranted()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAliases(neededAliases(), call, "permsCallback");
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", allGranted());
        call.resolve(r);
    }

    // ---------- callbacks de Nearby ----------

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String endpointId, Payload payload) {
            if (payload.getType() != Payload.Type.BYTES || payload.asBytes() == null) return;
            JSObject e = new JSObject();
            e.put("id", endpointId);
            e.put("data", new String(payload.asBytes(), StandardCharsets.UTF_8));
            notifyListeners("message", e);
        }

        @Override
        public void onPayloadTransferUpdate(String endpointId, PayloadTransferUpdate update) {}
    };

    private final ConnectionLifecycleCallback lifecycle = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String endpointId, ConnectionInfo info) {
            // Se acepta sola: la sala ya se eligió por código.
            client.acceptConnection(endpointId, payloadCallback);
            JSObject e = new JSObject();
            e.put("id", endpointId);
            e.put("name", info.getEndpointName());
            notifyListeners("initiated", e);
        }

        @Override
        public void onConnectionResult(String endpointId, ConnectionResolution result) {
            JSObject e = new JSObject();
            e.put("id", endpointId);
            if (result.getStatus().isSuccess()) {
                connected.add(endpointId);
                notifyListeners("connected", e);
            } else {
                e.put("code", result.getStatus().getStatusCode());
                notifyListeners("connectFailed", e);
            }
        }

        @Override
        public void onDisconnected(String endpointId) {
            connected.remove(endpointId);
            JSObject e = new JSObject();
            e.put("id", endpointId);
            notifyListeners("disconnected", e);
        }
    };

    private final EndpointDiscoveryCallback discovery = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(String endpointId, DiscoveredEndpointInfo info) {
            JSObject e = new JSObject();
            e.put("id", endpointId);
            e.put("name", info.getEndpointName());
            notifyListeners("endpointFound", e);
        }

        @Override
        public void onEndpointLost(String endpointId) {
            JSObject e = new JSObject();
            e.put("id", endpointId);
            notifyListeners("endpointLost", e);
        }
    };

    private static int statusOf(Exception err) {
        return (err instanceof ApiException) ? ((ApiException) err).getStatusCode() : -1;
    }

    // ---------- métodos para el juego ----------

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String name = call.getString("name", "odin");
        AdvertisingOptions opts = new AdvertisingOptions.Builder().setStrategy(Strategy.P2P_STAR).build();
        client
            .startAdvertising(name, SERVICE_ID, lifecycle, opts)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(err -> {
                if (statusOf(err) == ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING) call.resolve();
                else call.reject("No se pudo anunciar la sala: " + err.getMessage(), "advertise_failed");
            });
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        DiscoveryOptions opts = new DiscoveryOptions.Builder().setStrategy(Strategy.P2P_STAR).build();
        client
            .startDiscovery(SERVICE_ID, discovery, opts)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(err -> {
                if (statusOf(err) == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING) call.resolve();
                else call.reject("No se pudo buscar salas: " + err.getMessage(), "discovery_failed");
            });
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        client.stopDiscovery();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String id = call.getString("id");
        String name = call.getString("name", "odin");
        if (id == null) {
            call.reject("Falta el id", "invalid_argument");
            return;
        }
        client
            .requestConnection(name, id, lifecycle)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(err -> {
                if (statusOf(err) == ConnectionsStatusCodes.STATUS_ALREADY_CONNECTED_TO_ENDPOINT) call.resolve();
                else call.reject("No se pudo conectar: " + err.getMessage(), "connect_failed");
            });
    }

    @PluginMethod
    public void send(PluginCall call) {
        String data = call.getString("data", "");
        String id = call.getString("id");
        List<String> targets = new ArrayList<>();
        if (id != null) {
            if (connected.contains(id)) targets.add(id);
        } else {
            targets.addAll(connected);
        }
        if (targets.isEmpty()) {
            call.resolve();
            return;
        }
        client.sendPayload(targets, Payload.fromBytes(data.getBytes(StandardCharsets.UTF_8)));
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        client.stopAllEndpoints();
        client.stopAdvertising();
        client.stopDiscovery();
        connected.clear();
        call.resolve();
    }
}
