import { Dimensions } from 'react-native'

// Dimensions.get은 모듈 평가 시점에 호출되므로 전역 spy로 처리
jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 })
