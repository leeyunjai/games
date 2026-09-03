# 외부 라이브러리·모델 반입 규칙

이 저장소는 **웹에서만 동작하고, 오프라인에서도 그대로 실행**되는 것을 전제로 합니다.
그래서 런타임에 외부 호스트를 부르는 코드는 넣지 않습니다.

## 원칙

1. **CDN 금지.** `unpkg`, `jsdelivr`, `cdn.google` 등에서 스크립트·모델·폰트를 가져오지 않습니다.
   네트워크가 없으면 게임이 죽고, 배포처가 바뀌면 CORS로 막히며, 오프라인 설치가 깨집니다.
2. **모든 파일은 저장소 안에.** npm 패키지로 설치해 번들에 포함하거나,
   번들이 어려운 대용량 자원(모델 가중치, wasm)은 `public/vendor/<이름>/`에 그대로 둡니다.
3. **경로는 상대 경로.** `base`가 `./`이므로 절대 경로(`/vendor/...`)를 쓰면 하위 경로 배포에서 깨집니다.
   런타임에서는 `new URL('vendor/xxx/model.task', import.meta.url)` 형태로 참조하세요.
4. **라이선스 동봉.** `public/vendor/<이름>/LICENSE`를 함께 넣고, 출처와 버전을 `README`에 적습니다.

## MediaPipe 같은 것을 쓰게 된다면

예: 손 제스처로 조작하는 게임을 붙이는 경우.

```
public/vendor/mediapipe/
  vision_bundle.mjs        # @mediapipe/tasks-vision 배포본
  vision_wasm_internal.wasm
  hand_landmarker.task     # 모델 가중치
  LICENSE
```

```ts
const visionRoot = new URL('../../../vendor/mediapipe/', import.meta.url).href;
const vision = await FilesetResolver.forVisionTasks(visionRoot);
const landmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: { modelAssetPath: new URL('hand_landmarker.task', visionRoot).href },
});
```

체크할 것:

- **용량.** 모델이 수십 MB면 서비스 워커 프리캐시에 넣지 말고, 그 게임에 들어갈 때
  받아서 캐시하도록 별도 처리하세요(`vite.config.ts`의 `STATIC_PRECACHE`에 넣지 않기).
- **wasm MIME.** GitHub Pages는 `.wasm`을 제대로 내려주지만, 다른 정적 호스팅을 쓰면 확인이 필요합니다.
- **권한.** 카메라·마이크는 사용자 동작으로 시작하고, 거부됐을 때의 대체 조작을 반드시 둡니다.
- **성능.** 저사양 기기에서 프레임이 무너지면 게임이 아니라 데모가 됩니다.
  `navigator.hardwareConcurrency` 등으로 낮은 사양을 감지해 기능을 낮추세요(장기 AI가 같은 방식을 씁니다).

## 폰트

시스템 폰트만 씁니다(`Pretendard`가 설치돼 있으면 쓰고, 없으면 시스템 기본).
웹폰트를 넣어야 한다면 `public/vendor/fonts/`에 두고 `@font-face`로 상대 경로 참조하세요.
