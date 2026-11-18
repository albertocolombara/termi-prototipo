import ExpoModulesCore

// iOS ainda não faz parte do protótipo: respostas neutras para o app compilar.
public class ScreenStateModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenState")
    Function("isInteractive") { true }
    Function("isLocked") { false }
    Function("isInCall") { false }
    Function("lastScreenOffAt") { 0.0 }
    Function("lastScreenOnAt") { 0.0 }
    Function("showFlightNotification") { (_: String, _: String, _: Double) in }
    Function("hideFlightNotification") {}
  }
}
