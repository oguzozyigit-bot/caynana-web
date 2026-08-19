package ai.caynana.telefoncall

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val trustedHost = "www.caynana.ai"

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        val number = PhoneIdentity.ensureNumber(this)
        startForegroundService(Intent(this, CallKeepAliveService::class.java))

        web = WebView(this)
        setContentView(web)

        WebView.setWebContentsDebuggingEnabled(false)
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            WebView.startSafeBrowsing(this, null)
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_NO_CACHE
            databaseEnabled = false
            setGeolocationEnabled(false)
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(web, false)
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val req = request ?: return true
                val uri = req.url

                // Links loaded by the in-app Browser's iframe stay inside that blank browser area.
                // They never launch Chrome/the system browser automatically.
                if (!req.isForMainFrame) {
                    return uri.scheme != "https"
                }

                // The privileged top-level app itself may only navigate on our own HTTPS origin.
                val trusted = uri.scheme == "https" && uri.host == trustedHost
                return !trusted
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.cancel()
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val origin = request.origin
                    val trusted = origin.scheme == "https" && origin.host == trustedHost
                    if (!trusted) {
                        request.deny()
                        return@runOnUiThread
                    }
                    val allowed = request.resources.filter {
                        it == PermissionRequest.RESOURCE_AUDIO_CAPTURE ||
                            it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                    }.toTypedArray()
                    if (allowed.isNotEmpty()) request.grant(allowed) else request.deny()
                }
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
