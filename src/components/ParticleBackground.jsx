import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ParticleBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 3

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Particles
    const count = 600
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8

      // Mostly cyan, some green accent
      if (Math.random() > 0.85) {
        colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0.53 // green
      } else {
        colors[i * 3] = 0; colors[i * 3 + 1] = 0.83; colors[i * 3 + 2] = 1 // cyan
      }
      sizes[i] = Math.random() * 3 + 0.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geo, mat)
    scene.add(points)

    // Grid lines for circuit board effect
    const gridGeo = new THREE.BufferGeometry()
    const gridPositions = []
    const gridSize = 12
    const gridDiv = 20
    for (let i = 0; i <= gridDiv; i++) {
      const pos = (i / gridDiv) * gridSize - gridSize / 2
      gridPositions.push(-gridSize / 2, -3, pos, gridSize / 2, -3, pos)
      gridPositions.push(pos, -3, -gridSize / 2, pos, -3, gridSize / 2)
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3))
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00D4FF, transparent: true, opacity: 0.06 })
    const grid = new THREE.LineSegments(gridGeo, gridMat)
    scene.add(grid)

    // Translucent logo in center
    const loader = new THREE.TextureLoader()
    loader.load(`${import.meta.env.BASE_URL}logo.png`, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      const aspect = texture.image.width / texture.image.height
      const logoSize = 2.5
      const logoGeo = new THREE.PlaneGeometry(logoSize * aspect, logoSize)
      const logoMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const logoMesh = new THREE.Mesh(logoGeo, logoMat)
      logoMesh.position.z = -2
      scene.add(logoMesh)
    })

    // Mouse tracking
    let mouseX = 0, mouseY = 0
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    // Animation
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const t = Date.now() * 0.0003

      points.rotation.y = t * 0.3 + mouseX * 0.1
      points.rotation.x = mouseY * 0.05
      grid.rotation.y = t * 0.1

      // Float particles
      const pos = geo.attributes.position.array
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(t * 2 + i) * 0.0003
      }
      geo.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} id="three-bg" />
}
