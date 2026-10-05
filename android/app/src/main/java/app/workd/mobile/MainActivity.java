package app.workd.mobile;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // BridgeActivity เรียก onNewIntent ตอนเปิดแอปด้วย จึงรับได้ทั้งตอนแอปปิดอยู่และเปิดค้างไว้
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openLoginResult(intent);
    }

    // รับผลล็อกอินจาก Chrome (app.workd.mobile://login#access_token=...)
    // แล้วเปิดเว็บ work D ในแอปพร้อมโทเคนนั้น ให้ Supabase บันทึกการล็อกอินไว้ในแอป
    private void openLoginResult(Intent intent) {
        if (intent == null || bridge == null) return;
        Uri data = intent.getData();
        if (data == null || !"app.workd.mobile".equals(data.getScheme()) || !"login".equals(data.getHost())) return;
        String base = bridge.getConfig().getServerUrl();
        if (base == null) return;
        base = base.replaceAll("/+$", "") + "/";
        String query = data.getEncodedQuery();
        String fragment = data.getEncodedFragment();
        final String target = base + (query != null ? "?" + query : "") + (fragment != null ? "#" + fragment : "");
        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(target));
    }
}
