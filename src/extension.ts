import * as vscode from "vscode"

export const activate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("mrtommy.preview-scene", () => {
      const editor = vscode.window.activeTextEditor

      if (!editor) {
        vscode.window.showErrorMessage(
          "Cannot preview scene without an active editor!"
        )
        return
      }

      const document = editor.document

      if (!editor.document.fileName.endsWith(".scene.json")) {
        vscode.window.showWarningMessage(
          "Opening scene preview for possibly non scene file. Scenes should be named `example.scene.json`."
        )
      }

      const panel = vscode.window.createWebviewPanel(
        "mrtommy.preview-scene",
        "Scene Preview",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      )

      const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document !== document) {
          return
        }
        try {
          JSON.parse(document.getText())
          panel.webview.html = getScenePreview(document.getText())
          panel.title = "Scene Preview"
        } catch (ignored) {
          panel.title = "Scene Preview (Outdated)"
        }
      })
      panel.onDidDispose(subscription.dispose)

      panel.webview.html = getScenePreview(document.getText())
    })
  )
}

const getScenePreview = (text: string) => {
  return `
<!DOCTYPE html>
<html lang="en" style="width: 100%; height: 100%;">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>

	<body style="width: 100%; height: 100%; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center">
		<canvas id="canvas"></canvas>	

		<script>
			const INFINITY = 999999999999
			const ROBOT_COLORS = ["yellow", "green", "cyan", "blue", "indigo", "fuchsia"]

			let scene
			try {
				scene = JSON.parse(\`${text}\`)
			} catch (ignored) { }

			const fillCircle = (c, x, y, radius, color) => {
				c.beginPath()
				c.arc(x, y, radius, 0, 2 * Math.PI, false)
				c.fillStyle = color
				c.closePath()
				c.fill()
			}

			const strokeCircle = (c, x, y, radius, color) => {
				c.beginPath()
				c.arc(x, y, radius, 0, 2 * Math.PI, false)
				c.strokeStyle = color
				c.lineWidth = 5
				c.closePath()
				c.stroke()
			}

			const canvas = document.getElementById("canvas")

			const render = () => {
				// Get scene boundaries
				let xMin = INFINITY
				let yMin = INFINITY
				let xMax = -INFINITY
				let yMax = -INFINITY

				for (const robot of scene.robots) {
					xMin = Math.min(xMin, robot.start[0] - robot.radius)
					xMin = Math.min(xMin, robot.end[0] - robot.radius)
					yMin = Math.min(yMin, robot.start[1] - robot.radius)
					yMin = Math.min(yMin, robot.end[1] - robot.radius)
					xMax = Math.max(xMax, robot.start[0] + robot.radius)
					xMax = Math.max(xMax, robot.end[0] + robot.radius)
					yMax = Math.max(yMax, robot.start[1] + robot.radius)
					yMax = Math.max(yMax, robot.end[1] + robot.radius)
				}

				for (const obstacle of scene.obstacles) {
					xMin = Math.min(xMin, obstacle.location[0] - obstacle.radius)
					yMin = Math.min(yMin, obstacle.location[1] - obstacle.radius)
					xMax = Math.max(xMax, obstacle.location[0] + obstacle.radius)
					yMax = Math.max(yMax, obstacle.location[1] + obstacle.radius)
				}

				// Padding
				let sceneWidth = xMax - xMin
				let sceneHeight = yMax - yMin
				xMin -= sceneWidth * 0.02
				xMax += sceneWidth * 0.02
				yMin -= sceneHeight * 0.02
				yMax += sceneHeight * 0.02

				sceneWidth = xMax - xMin
				sceneHeight = yMax - yMin
				const sceneAspectRatio = sceneWidth / sceneHeight

				canvas.width = Math.min(document.body.scrollWidth - 20, (document.body.scrollHeight - 20) * sceneAspectRatio)
				canvas.height = canvas.width / sceneAspectRatio

				const context = canvas.getContext("2d")
				const transformX = (x) => (x - xMin) * canvas.width / sceneWidth
				const transformY = (y) => (yMax - y) * canvas.height / sceneHeight
				const transformSize = (x) => x * canvas.width / sceneWidth

				for (const obstacle of scene.obstacles) {
					fillCircle(context, transformX(obstacle.location[0]), transformY(obstacle.location[1]), transformSize(obstacle.radius), "red")
				}

				for (let i = 0; i < scene.robots.length; i++) {
					const robot = scene.robots[i]
					const color = ROBOT_COLORS[i % ROBOT_COLORS.length]
					strokeCircle(context, transformX(robot.start[0]), transformY(robot.start[1]), transformSize(robot.radius), color)
					fillCircle(context, transformX(robot.end[0]), transformY(robot.end[1]), transformSize(robot.radius), color)
				}
			}

			render()
			window.addEventListener("resize", render)
		</script>
	</body>
</html>
	`.trim()
}

export const deactivate = () => {}
