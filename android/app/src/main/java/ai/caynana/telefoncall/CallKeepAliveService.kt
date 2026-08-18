package ai.caynana.telefoncall

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat

class CallKeepAliveService : Service() {
    companion object {
        const val CHANNEL = "telefon_call_service"
        const val NOTIFICATION_ID = 501
    }

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
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Bu servis Android tarafındaki çağrı kanalını ayakta tutar.
        // Kalıcı çağrı sinyalleşme sunucusu bağlandığında WebSocket istemcisi burada çalışacak.
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
