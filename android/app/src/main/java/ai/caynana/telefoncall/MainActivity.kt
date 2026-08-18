package ai.caynana.telefoncall

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val number = PhoneIdentity.ensureNumber(this)
        startForegroundService(Intent(this, CallKeepAliveService::class.java))

        web = WebView(this)
        setContentView(web)

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.webViewClient = WebViewClient()
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }

        requestNeededPermissions()
        val url = "https://www.caynana.ai/payphone/app.html?native=android&number=" + Uri.encode(number)
        web.loadUrl(url)
    }

    private fun requestNeededPermissions() {
        val wanted = buildList {
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) add(Manifest.permission.RECORD_AUDIO)
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) add(Manifest.permission.CAMERA)
            if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (wanted.isNotEmpty()) permissionLauncher.launch(wanted.toTypedArray())
    }

    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}

object PhoneIdentity {
    private const val PREFS = "telefon_call"
    private const val KEY = "own_number"

    fun ensureNumber(context: android.content.Context): String {
        val p = context.getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE)
        val existing = p.getString(KEY, null)
        if (existing != null && Regex("^0500\\d{7}$").matches(existing)) return existing
        val suffix = (0..9_999_999).random().toString().padStart(7, '0')
        val number = "0500$suffix"
        p.edit().putString(KEY, number).apply()
        return number
    }
}
