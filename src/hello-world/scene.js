import * as BABYLON from '@babylonjs/core'
import { noa } from './engine.js'

export const scene = noa.rendering.getScene()
const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene)
light.intensity = 1.0
scene.clearColor = new BABYLON.Color4(0.55, 0.75, 1.0, 1.0)
