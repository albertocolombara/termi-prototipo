package expo.modules.screenstate

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * O que o JS não consegue saber sozinho no Android:
 * - se a tela foi desligada (bloqueio) ou se o usuário trocou de app;
 * - se há uma ligação em andamento;
 * - mostrar o voo numa notificação fixa com contagem regressiva que anda sem o app rodar.
 */
class ScreenStateModule : Module() {
  private var lastScreenOffAt = 0.0
  private var lastScreenOnAt = 0.0
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Sem contexto do app")

  override fun definition() = ModuleDefinition {
    Name("ScreenState")

    OnCreate {
      val ctx = appContext.reactContext ?: return@OnCreate
      val r = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
          val now = System.currentTimeMillis().toDouble()
          when (intent?.action) {
            Intent.ACTION_SCREEN_OFF -> lastScreenOffAt = now
            Intent.ACTION_SCREEN_ON -> lastScreenOnAt = now
          }
        }
      }
      val filter = IntentFilter().apply {
        addAction(Intent.ACTION_SCREEN_OFF)
        addAction(Intent.ACTION_SCREEN_ON)
      }
      if (Build.VERSION.SDK_INT >= 33) {
        ctx.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
      } else {
        ctx.registerReceiver(r, filter)
      }
      receiver = r
    }

    OnDestroy {
      try {
        receiver?.let { appContext.reactContext?.unregisterReceiver(it) }
      } catch (_: Exception) {
      }
      receiver = null
    }

    Function("isInteractive") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    }

    Function("isLocked") {
      (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
    }

    Function("isInCall") {
      val mode = (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager).mode
      mode == AudioManager.MODE_IN_CALL ||
        mode == AudioManager.MODE_IN_COMMUNICATION ||
        mode == AudioManager.MODE_RINGTONE
    }

    Function("lastScreenOffAt") { lastScreenOffAt }

    Function("lastScreenOnAt") { lastScreenOnAt }

    Function("showFlightNotification") { title: String, text: String, endAt: Double ->
      val ctx = context
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= 26) {
        val channel = NotificationChannel(CHANNEL_ID, "Voo em andamento", NotificationManager.IMPORTANCE_LOW)
        channel.setShowBadge(false)
        nm.createNotificationChannel(channel)
      }
      val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
      val pending = PendingIntent.getActivity(
        ctx, 0, launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      val builder = if (Build.VERSION.SDK_INT >= 26) {
        Notification.Builder(ctx, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(ctx)
      }
      builder
        .setSmallIcon(ctx.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(text)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setContentIntent(pending)
        .setShowWhen(true)
        .setWhen(endAt.toLong())
        .setUsesChronometer(true)
      if (Build.VERSION.SDK_INT >= 24) builder.setChronometerCountDown(true)
      if (Build.VERSION.SDK_INT >= 26) {
        val remaining = (endAt - System.currentTimeMillis()).toLong()
        builder.setTimeoutAfter(maxOf(1000L, remaining))
      }
      nm.notify(NOTIFICATION_ID, builder.build())
    }

    Function("hideFlightNotification") {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(NOTIFICATION_ID)
    }
  }

  companion object {
    private const val CHANNEL_ID = "voo_em_andamento"
    private const val NOTIFICATION_ID = 4210
  }
}
