import { Suspense, useEffect, useState, useRef } from "react";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";

import {
    EffectComposer,
    Noise,
    Bloom,
    Vignette,
    ChromaticAberration,
    ToneMapping,
    Scanline,
} from "@react-three/postprocessing";

import * as THREE from "three";

import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"; // To be able to load SVG graphics

import { OrbitControls, Preload, useTexture } from "@react-three/drei";

import CanvasLoader from "./Loader";

/***********************************************************************/
/*                               ROAD                                  */
/***********************************************************************/
const Road = () => {
    const roadGeometry = new THREE.PlaneGeometry(12, 300, 1, 1);
    roadGeometry.translate(0, 110, 0.1);
    roadGeometry.rotateX(-Math.PI * 0.5);

    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x03353b,
        transparent: true,
        opacity: 0.7,
    });

    return (
        <>
            <ambientLight />
            <mesh
                // ref={roadRef}
                position={[0, 1, 0.1]}
                geometry={roadGeometry}
                material={roadMaterial}
            />
        </>
    );
};

/***********************************************************************/
/*                               ROAD LINES                            */
/***********************************************************************/
const RoadLines = () => {
    const [roadLines, setRoadLines] = useState(null);
    const roadLineLeftGeometry = new THREE.PlaneGeometry(0.35, 300, 1, 1);
    roadLineLeftGeometry.translate(-5.2, 110, 0.2);
    roadLineLeftGeometry.rotateX(-Math.PI * 0.5);

    const roadLineRightGeometry = new THREE.PlaneGeometry(0.35, 300, 1, 1);
    roadLineRightGeometry.translate(5.2, 110, 0.2);
    roadLineRightGeometry.rotateX(-Math.PI * 0.5);

    const roadLineCenterLeftGeometry = new THREE.PlaneGeometry(0.15, 300, 1, 1);
    roadLineCenterLeftGeometry.translate(-1.8, 110, 0.2);
    roadLineCenterLeftGeometry.rotateX(-Math.PI * 0.5);

    const roadLineCenterRightGeometry = new THREE.PlaneGeometry(
        0.15,
        300,
        1,
        1
    );
    roadLineCenterRightGeometry.translate(1.8, 110, 0.2);
    roadLineCenterRightGeometry.rotateX(-Math.PI * 0.5);

    // Merge all road lines geometries
    const roadLinesConception = [
        roadLineLeftGeometry,
        roadLineRightGeometry,
        roadLineCenterLeftGeometry,
        roadLineCenterRightGeometry,
    ];
    const roadLinesGeometry = mergeGeometries(roadLinesConception, false);

    const roadLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
    });

    useEffect(() => {
        if (!roadLines) {
            const newRoadLines = new THREE.Mesh(
                roadLinesGeometry,
                roadLineMaterial
            );
            setRoadLines(newRoadLines);
        }
    }, [roadLines, roadLinesGeometry, roadLineMaterial]);

    if (roadLines) {
        return (
            <>
                <ambientLight />
                <mesh>
                    <primitive object={roadLines} />
                </mesh>
            </>
        );
    } else {
        return null;
    }
};

/***********************************************************************/
/*                               FLOOR                                 */
/***********************************************************************/
const Floor = () => {
    const materialRef = useRef();
    const [mounted, setMounted] = useState(false);
    const floorGeometry = new THREE.PlaneGeometry(500, 500, 1, 1);
    floorGeometry.translate(0, 110, 0);
    floorGeometry.rotateX(-Math.PI * 0.5);

    useEffect(() => {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xef9af2) },
                time: { value: 0.0 },
                speed: { value: 10.0 },
            },
            vertexShader: `
            uniform float time;
            uniform float speed;
            varying vec3 vPos;
    
            void main() {
                vec3 pos = position;
                pos.y += 0.1 * sin(pos.x * 5.0 + time * 3.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                vec2 tuv = uv;
                float t = time * 0.001 * speed;
                vPos = pos;
            }
            `,
            fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform vec3 color;
            varying vec3 vPos;
    
            float line(vec3 position, float width, vec3 step){
                vec3 tempCoord = position / step;
    
                vec2 coord = tempCoord.xz;
                coord.y -= time * speed / 2.;
    
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord * width);
                float line = min(grid.x, grid.y);
    
                return min(line, 1.0);
            }
    
            void main() {
                float l = line(vPos, 1.0, vec3(2.0)); // grid line width
                vec3 base = mix(vec3(0, 0.75, 0), vec3(0), smoothstep(0., 0., abs(vPos.x))); //ROAD COLOR
                vec3 colorMix = mix(vec3(0.5 + 0.5 * sin(time)), base, l) * color;
                gl_FragColor = vec4(colorMix, 1.0);
            }
        `,
        });
        materialRef.current = material;
    }, []);

    useFrame(({ clock }) => {
        if (mounted) {
            if (materialRef.current) {
                materialRef.current.uniforms.time.value = clock.elapsedTime;
            }
        }
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return <mesh geometry={floorGeometry} material={materialRef.current} />;
};

/***********************************************************************/
/*                               SIDE WALK                             */
/***********************************************************************/
const SideWalk = () => {
    const materialRef = useRef();
    const [mounted, setMounted] = useState(false);

    const sidewalkTopLeftGeometry = new THREE.PlaneGeometry(8, 300, 1, 1);
    sidewalkTopLeftGeometry.translate(-10, 110, 0.5);
    sidewalkTopLeftGeometry.rotateX(-Math.PI * 0.5);

    const sidewalkSideLeftGeometry = new THREE.PlaneGeometry(0.5, 300, 1, 1);
    sidewalkSideLeftGeometry.translate(0.06, 110, 6);
    sidewalkSideLeftGeometry.rotateX(-Math.PI * 0.5);
    sidewalkSideLeftGeometry.rotateZ(Math.PI * 0.49);

    const sidewalkTopRightGeometry = new THREE.PlaneGeometry(8, 300, 1, 1);
    sidewalkTopRightGeometry.translate(10, 110, 0.5);
    sidewalkTopRightGeometry.rotateX(-Math.PI * 0.5);

    const sidewalkSideRightGeometry = new THREE.PlaneGeometry(0.5, 300, 1, 1);
    sidewalkSideRightGeometry.translate(0.44, 110, -6);
    sidewalkSideRightGeometry.rotateX(-Math.PI * 0.5);
    sidewalkSideRightGeometry.rotateZ(Math.PI * 0.49);

    const sideWalkConception = [
        sidewalkTopLeftGeometry,
        sidewalkSideLeftGeometry,
        sidewalkTopRightGeometry,
        sidewalkSideRightGeometry,
    ];

    const sideWalkGeometry = mergeGeometries(sideWalkConception, false);

    useEffect(() => {
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            uniforms: {
                color: { value: new THREE.Color(0x1be9ff) },
                time: { value: 0.0 },
                speed: { value: 10.0 },
            },
            vertexShader: `
            uniform float time;
            uniform float speed;
            varying vec3 vPos;
    
            void main() {
                vec3 pos = position;
                pos.y += 0.1 * sin(pos.x * 5.0 + time * 3.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                vec2 tuv = uv;
                float t = time * 0.001 * speed;
                vPos = pos;
            }
            `,
            fragmentShader: `
            uniform float time;
            uniform float speed;
            uniform vec3 color;
            varying vec3 vPos;
    
            float line(vec3 position, float width, vec3 step){
                vec3 tempCoord = position / step;
    
                vec2 coord = tempCoord.xz;
                coord.y -= time * speed / 2.;
    
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord * width);
                float line = min(grid.x, grid.y);
    
                return min(line, 1.0);
            }
    
            void main() {
                float l = line(vPos, 1.0, vec3(2.0)); // grid line width
                vec3 base = mix(vec3(0, 0.75, 0), vec3(0), smoothstep(0., 0., abs(vPos.x))); //ROAD COLOR
                vec3 colorMix = mix(vec3(0.5 + 0.5 * sin(time)), base, l) * color;
                gl_FragColor = vec4(colorMix, 1.0);
            }
        `,
        });
        materialRef.current = material;
    }, []);

    useFrame(({ clock }) => {
        if (mounted) {
            if (materialRef.current) {
                materialRef.current.uniforms.time.value = clock.elapsedTime;
            }
        }
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (sideWalkGeometry) {
        return (
            <>
                <ambientLight />
                <mesh
                    geometry={sideWalkGeometry}
                    material={materialRef.current}
                />
            </>
        );
    } else {
        return null;
    }
};

/***********************************************************************/
/*                               PALM TREES                            */
/***********************************************************************/
const PalmTrees = () => {
    const materialRef = useRef();

    const [mounted, setMounted] = useState(false);

    let palmTreeConception = [];

    var logGeometry = new THREE.CylinderGeometry(0.25, 0.125, 10, 5, 4, true);
    logGeometry.translate(0, 5, 0);

    palmTreeConception.push(logGeometry);

    // palm tree leaves
    for (let i = 0; i < 35; i++) {
        let leafGeometry = new THREE.CircleGeometry(1.25, 4);
        leafGeometry.translate(0, 1.25, 0);
        leafGeometry.rotateX(-Math.PI * 0.5);
        leafGeometry.scale(0.25, 1, THREE.MathUtils.randFloat(1, 1.5));
        leafGeometry.attributes.position.setY(0, 0.25);
        leafGeometry.rotateX(THREE.MathUtils.randFloatSpread(Math.PI * 0.5));
        leafGeometry.rotateY(THREE.MathUtils.randFloat(0, Math.PI * 2));
        leafGeometry.translate(0, 10, 0);
        palmTreeConception.push(leafGeometry);
    }

    var palmTree = mergeGeometries(palmTreeConception, false);

    palmTree.rotateZ(THREE.MathUtils.degToRad(-1.5));

    var palmTreeInstance = new THREE.InstancedBufferGeometry();
    palmTreeInstance.attributes.position = palmTree.attributes.position;
    palmTreeInstance.attributes.uv = palmTree.attributes.uv;
    palmTreeInstance.index = palmTree.index;

    var palmTreePosition = [];

    for (let i = 0; i < 40; i++) {
        var resultLeft = randomize(-25, -200, 1);
        var resultRight = randomize(25, 160, 1);

        palmTreePosition.push(-10, 0, i * 2 * 15 - 10 - 50);
        palmTreePosition.push(10, 0, i * 2 * 15 - 50);
        palmTreePosition.push(resultLeft, 0, i * 2 * 15 - resultLeft - 50);
        palmTreePosition.push(resultRight, 0, i * 2 * 15 + resultRight - 50);
    }

    palmTreeInstance.setAttribute(
        "instPosition",
        new THREE.InstancedBufferAttribute(
            new Float32Array(palmTreePosition),
            3
        )
    );

    useEffect(() => {
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            wireframe: true,

            uniforms: {
                color: { value: new THREE.Color(0x056023) },
                speed: { value: 15 },
                time: { value: 0 },
                value1: { value: 950.0 },
                value2: { value: 800.0 },
                scale: { value: 0.5 },
                transformedY: { value: 0.5 },
                transformedX: { value: 0.5 },
                emissiveIntensity: { value: 3.5 },
            },
            vertexShader: `
            uniform float speed;
            uniform float time;
            uniform float value1;
            uniform float value2;
            uniform float scale;
            uniform float transformedY;
            uniform float transformedX;
            uniform vec3 color;
            attribute vec3 instPosition;

            void main() {
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
                
                float value1 = 1250.0;
                float value2 = 1100.0;
                float transformedX = 1.0;

                vec3 ip = instPosition;
                ip.z = mod(ip.z + time * speed, value1) - value2;
                mvPosition.xyz *= transformedX;
                mvPosition.xyz += ip;
                gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
            }
            `,
            fragmentShader: `
            
            uniform vec3 color;
            uniform float emissiveIntensity;

            void main() {
                gl_FragColor = vec4(color * emissiveIntensity, 1.0);
            }
            `,
        });
        materialRef.current = material;
    }, []);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useFrame(({ clock }) => {
        if (mounted) {
            if (materialRef.current) {
                materialRef.current.uniforms.time.value = clock.elapsedTime;
            }
        }
    });

    return (
        <>
            <ambientLight />
            <mesh geometry={palmTreeInstance} material={materialRef.current} />
        </>
    );
};

/***********************************************************************/
/*                               SKY BOX                               */
/***********************************************************************/
const SkyBox = () => {
    const texture = useTexture("/skybox/2048/px.png");

    return (
        <>
            <ambientLight />
            <mesh position={[0, 0, -520]}>
                <planeGeometry args={[1024, 1024]} />
                <meshBasicMaterial map={texture} />
            </mesh>
        </>
    );
};

/***********************************************************************/
/*                         GROUPED PYRAMIDS                            */
/***********************************************************************/
const GroupedPyramids = () => {
    const mergedMaterialRef = useRef();

    const pyramidGroupConception = [];

    const [mounted, setMounted] = useState(false);

    // Variables
    let pyramidGeometry;

    let minRandomSize, maxRandomSize, minTranslateX, maxTranslateX;

    let minRotatePyramid = 0;
    let maxRotatePyramid = 2;
    let minTranslateZ = 0;
    let maxTranslateZ = 1000;

    for (let i = 0; i < 80; i++) {
        if (i < 60) {
            //Furthest
            minRandomSize = 20;
            maxRandomSize = 30;
            minTranslateX = 40;
            maxTranslateX = 200;
        } else if (i >= 60) {
            minRandomSize = 3;
            maxRandomSize = 8;
            minTranslateX = 40;
            maxTranslateX = 200;
        }

        if (i % 2 == 0) {
            minTranslateX *= -1;
            maxTranslateX *= -1;
        }

        var randomSize = randomize(minRandomSize, maxRandomSize, "int");
        var translateX = randomize(minTranslateX, maxTranslateX, "float");
        var rotatePyramid = randomize(
            minRotatePyramid,
            maxRotatePyramid,
            "float"
        );
        var translateZ = randomize(minTranslateZ, maxTranslateZ, "float");

        pyramidGeometry = new THREE.ConeGeometry(
            randomSize,
            randomSize,
            4,
            1,
            true,
            rotatePyramid
        );
        pyramidGeometry.translate(translateX, 0, translateZ);
        pyramidGroupConception.push(pyramidGeometry);
    }

    let pyramidGroupGeometry = mergeGeometries(pyramidGroupConception, false);

    let pyramidGroupPosition = [0, 0, 0, 0, 0, 260, 0, 0, 520, 0, 0, 780];

    let instPosition = new THREE.BufferAttribute(
        new Float32Array(pyramidGroupPosition),
        2
    );

    useEffect(() => {
        const mergedMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x570296) },
                speed: { value: 15 },
                time: { value: 0 },
                value1: { value: 950.0 },
                value2: { value: 800.0 },
                scale: { value: 1.0 },
                transformedY: { value: 1.0 },
                transformedX: { value: 1.0 },
                emissiveIntensity: { value: 3.5 },
                instPosition: { value: instPosition },
            },
            vertexShader: `
    uniform float speed;
    uniform float time;
    uniform float value1;
    uniform float value2;
    uniform float scale;
    uniform float transformedY;
    uniform float transformedX;
    attribute vec3 instPosition;

    void main() {
        vec3 transformed = position;
        vec3 ip = instPosition;
        ip.z = mod(ip.z + time * speed, value1) - value2;
        transformed *= scale;
        transformed.y *= transformedY;
        transformed.x *= transformedX;
        transformed += ip;

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `,
            fragmentShader: `
        uniform vec3 color;
        uniform float emissiveIntensity;

        void main() {
            gl_FragColor = vec4(color * emissiveIntensity, 1.0);
        }
    `,
        });

        mergedMaterialRef.current = mergedMaterial;
    }, []);

    useFrame(({ clock }) => {
        if (mounted) {
            mergedMaterialRef.current.uniforms.time.value = clock.elapsedTime;
        }
    });

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (mergedMaterialRef && pyramidGroupGeometry) {
        return (
            <>
                <ambientLight />
                <mesh
                    geometry={pyramidGroupGeometry}
                    material={mergedMaterialRef.current}
                />
            </>
        );
    } else {
        return null;
    }
};

/***********************************************************************/
/*                               SVGS                                  */
/***********************************************************************/
const SVGS = () => {
    const sun = [`/scenery/sun.svg`, -62.5, 90, -500, 0.11, "sun"];
    const city_far = [`/scenery/city_far.svg`, -68.5, 45, -450, 0.4, "cityFar"];
    const city_close = [
        `/scenery/city_close.svg`,
        -30.5,
        45,
        -300,
        0.2,
        "cityClose",
    ];

    const SVGLoaderComponent = ({ url, position, scale, name }) => {
        const { paths } = useLoader(SVGLoader, url);

        if (!paths) {
            return null;
        }

        return (
            <>
                <ambientLight />
                <group
                    position={position}
                    scale={[scale, -scale, scale]}
                    name={name}
                >
                    {paths.map((path, index) => (
                        <mesh
                            key={index}
                            geometry={
                                new THREE.ShapeGeometry(path.toShapes(true))
                            }
                            material={
                                new THREE.MeshStandardMaterial({
                                    color: path.color,
                                    side: THREE.DoubleSide,
                                    depthWrite: false,
                                })
                            }
                        />
                    ))}
                </group>
            </>
        );
    };

    return (
        <>
            <SVGLoaderComponent
                url={sun[0]}
                position={[sun[1], sun[2], sun[3]]}
                scale={sun[4]}
                name={sun[5]}
            />
            <SVGLoaderComponent
                url={city_far[0]}
                position={[city_far[1], city_far[2], city_far[3]]}
                scale={city_far[4]}
                name={city_far[5]}
            />
            <SVGLoaderComponent
                url={city_close[0]}
                position={[city_close[1], city_close[2], city_close[3]]}
                scale={city_close[4]}
                name={city_close[5]}
            />
        </>
    );
};

/***********************************************************************/
/*                               RANDOMIZE                             */
/***********************************************************************/
const randomize = (min, max, setting) => {
    let previousRandomFloat = 0;
    let previousRandomInteger = 0;
    let previousOddRandomInteger = 0;
    let previousEvenRandomInteger = 0;

    let randomResult;

    if (setting === "float") {
        // Get random float
        randomResult = Math.random() * (max - min + 1) + min;

        if (randomResult === previousRandomFloat) {
            do {
                randomResult = Math.random() * (max - min + 1) + min;
            } while (randomResult === previousRandomFloat);
            previousRandomFloat = randomResult;
        }
    } else if (setting === "int") {
        // Get random integer
        randomResult = Math.floor(Math.random() * (max - min + 1)) + min;

        if (randomResult === previousRandomInteger) {
            do {
                randomResult =
                    Math.floor(Math.random() * (max - min + 1)) + min;
            } while (randomResult === previousRandomInteger);
            previousRandomInteger = randomResult;
        }
    } else if (setting === 1 || setting === 2) {
        // Get random integer (Odd or Even)
        randomResult = Math.floor(Math.random() * (max - min + 1)) + min;

        if (
            randomResult === previousOddRandomInteger ||
            randomResult === previousEvenRandomInteger
        ) {
            if (setting === 1) {
                if (
                    randomResult < previousOddRandomInteger + 1 &&
                    randomResult > previousOddRandomInteger - 1
                ) {
                    do {
                        randomResult =
                            Math.floor(Math.random() * (max - min + 1)) + min;
                    } while (
                        randomResult < previousOddRandomInteger + 1 &&
                        randomResult > previousOddRandomInteger - 1
                    );
                }

                previousOddRandomInteger = randomResult;
            } else if (setting === 2) {
                if (
                    randomResult < previousEvenRandomInteger + 1 &&
                    randomResult > previousEvenRandomInteger - 1
                ) {
                    do {
                        randomResult =
                            Math.floor(Math.random() * (max - min + 1)) + min;
                    } while (
                        randomResult < previousEvenRandomInteger + 1 &&
                        randomResult > previousEvenRandomInteger - 1
                    );
                }

                previousEvenRandomInteger = randomResult;
            }
        }
    }
    return randomResult;
};

/***********************************************************************/
/*                               SynthWave Canvas                      */
/***********************************************************************/
const SynthwaveCanvas = () => {
    const camera = new THREE.PerspectiveCamera(
        45, //45
        window.innerWidth / window.innerHeight,
        10,
        2000
    );
    camera.position.set(0, 10.0, 45.0); // 0, 10.0, 45.0

    return (
        <Canvas camera={camera}>
            <EffectComposer>
                {/* Can only pick the Glitch affect or Chromatic Aberration */}
                {/* <Glitch delay={[2, 4]} duration={[0.5, 1]} strength={[0.04, 0.04]} /> */}
                <ChromaticAberration offset={[0.001, 0.004]} />

                <Bloom
                    luminanceThreshold={0}
                    luminanceSmoothing={0}
                    height={300}
                    opacity={2.0}
                />

                <Scanline density={0.7} opacity={0} />

                <Noise opacity={0.25} />

                <Vignette eskil={false} offset={0.1} darkness={0.9} />

                {/*  Tone Mapping: https://threejs.org/docs/index.html#api/en/constants/Renderer*/}
                {/* <ToneMapping exposure={Math.pow(1, 4.0)} toneMapping={THREE.ReinhardToneMapping} whitePoint={1.0}/> */}

                <ToneMapping
                    exposure={0.1}
                    toneMapping={THREE.ReinhardToneMapping}
                    whitePoint={2.0}
                />
            </EffectComposer>

            <ambientLight />
            <Suspense fallback={<CanvasLoader />}>
                {/* Orbit Controls Applies an Aspect Ratio I like */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    enabled={false}
                />
                {/* <Stars/> */}
                <SkyBox />

                <Road />
                <Floor />
                <RoadLines />
                <SideWalk />
                <GroupedPyramids />
                <PalmTrees />
                <SVGS />
            </Suspense>
            <Preload all />
        </Canvas>
    );
};

export default SynthwaveCanvas;
