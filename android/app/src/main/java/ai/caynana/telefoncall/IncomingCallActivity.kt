package ai.caynana.telefoncall

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class IncomingCallActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setShowWhenLocked(true)
        setTurnScreenOn(true)

        val number = intent.getStringExtra("from") ?: "0500"
        val kind = intent.getStringExtra("kind") ?: "voice"

        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(32, 32, 32, 32)
        }
        box.addView(TextView(this).apply {
            text = if (kind == "video") "Gelen görüntülü arama" else "Gelen arama"
            textSize = 26f
            gravity = Gravity.CENTER
        })
        box.addView(TextView(this).apply {
            text = number
            textSize = 30f
            gravity = Gravity.CENTER
        })
        box.addView(Button(this).apply {
            text = "CEVAPLA"
            setOnClickListener {
                startActivity(Intent(this@IncomingCallActivity, MainActivity::class.java).apply {
                    putExtra("incoming_from", number)
                    putExtra("incoming_kind", kind)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                })
                finish()
            }
        })
        box.addView(Button(this).apply {
            text = "REDDET"
            setOnClickListener { finish() }
        })
        setContentView(box)
    }
}
