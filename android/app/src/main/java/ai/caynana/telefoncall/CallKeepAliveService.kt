package ai.caynana.telefoncall

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class CallKeepAliveService : Service() {
    companion object {
        const val CHANNEL = "telefon_call_service"
        const val NOTIFICATION_ID = 501
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .retryOnConnectionFailure(true)
        .build()
    private var streamCall: Call? = null

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Telefon Call", NotificationManager.IMPORTANCE_LOW)
        )

        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle("Telefon Call hazır")
            .setContentText("0500 numaran gelen aramalar için hazır tutuluyor")
            .setContentIntent(open)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
        connectSignalStream()
    }

    private fun connectSignalStream() {
        streamCall?.cancel()
        val own = PhoneIdentity.ensureNumber(this)
        val topic = "caynana-call-$own"
        val request = Request.Builder()
            .url("https://ntfy.sh/$topic/json")
            .get()
            .build()

        streamCall = client.newCall(request)
        streamCall?.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (!call.isCanceled()) {
                    android.os.Handler(mainLooper).postDelayed({ connectSignalStream() }, 2500)
                }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use { res ->
                    val source = res.body?.source() ?: return
                    while (!source.exhausted() && !call.isCanceled()) {
                        val line = source.readUtf8Line() ?: continue
                        handleSignalLine(line)
                    }
                }
                if (!call.isCanceled()) {
                    android.os.Handler(mainLooper).postDelayed({ connectSignalStream() }, 1500)
                }
            }
        })
    }

    private fun handleSignalLine(line: String) {
        try {
            val envelope = JSONObject(line)
            if (envelope.optString("event") != "message") return
            val raw = envelope.optString("message")
            val payload = JSONObject(raw)
            if (payload.optString("type") != "call") return
            val from = payload.optString("from")
            val kind = payload.optString("kind", "voice")
            if (!Regex("^0500\\d{7}$").matches(from)) return

            val incoming = Intent(this, IncomingCallActivity::class.java).apply {
                putExtra("from", from)
                putExtra("kind", kind)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            startActivity(incoming)
        } catch (_: Exception) {
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (streamCall == null || streamCall?.isCanceled() == true) connectSignalStream()
        return START_STICKY
    }

    override fun onDestroy() {
        streamCall?.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
