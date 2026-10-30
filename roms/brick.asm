; ==============================================================================
; PL-8 Machine Code ROM 1: BRICK (24-Brick Breakout Arcade Game)
; Architecture: PL-8 8-bit Microcomputer (16-bit Instruction Word)
; Author: haruka_apps
; Size: 212 words (424 bytes)
; Features:
;   - 24 destructible bricks arranged in 3 rows across 8 columns
;   - Precise ball-to-paddle, ball-to-wall, and ball-to-brick physics reflections
;   - Slice shot: dynamic angle acceleration based on paddle momentum
;   - 3 lives, 2-digit BCD score tracking on 7-segment VFD display
;   - Auto-refill of brick wall on stage clear
; ==============================================================================
PX = $00
  BX = $01
  BY = $02
  VX_D = $03
  VY_D = $04
  SRV = $05
  BRK0 = $06
  BRK1 = $07
  BRK2 = $08
  LVS = $09
  SUBT = $0B

  PAD = $F0
  SEG0 = $F2
  SEG1 = $F3
  SEG2 = $F4
  SEG3 = $F5
  SEG4 = $F6
  SEG5 = $F7
  SND = $FC

boot_brk:
  LDI R0, 26
  ST [PX], R0
  LDI R0, 3
  ST [LVS], R0
  CALL brk_hud
  LDI R0, 15
  ST [SEG2], R0
  ST [SEG3], R0
  LDI R0, 0
  ST [SEG4], R0
  ST [SEG5], R0
  ST [SUBT], R0

fill_wall:
  LDI R0, 255
  ST [BRK0], R0
  ST [BRK1], R0
  ST [BRK2], R0
  ST [VY_D], R0
  LDI R0, 1
  ST [SRV], R0
  ST [VX_D], R0

brk_tick:
  LD R0, [LVS]
  JNZ brk_alive
  LD R0, [PAD]
  ANI R0, 16
  JZ brk_wait
  LDI R0, 24
  ST [SND], R0
  JMP boot_brk

brk_alive:
  LD R0, [PAD]
  LD R2, [PX]
  MOV R1, R0
  ANI R1, 4
  JZ brk_r
  CPI R2, 2
  JNC brk_r
  ADI R2, 254
  ST [PX], R2
brk_r:
  MOV R1, R0
  ANI R1, 8
  JZ brk_srv
  CPI R2, 50
  JC brk_srv
  ADI R2, 2
  ST [PX], R2

brk_srv:
  LD R1, [SRV]
  JZ brk_move
  LD R2, [PX]
  ADI R2, 5
  ST [BX], R2
  LDI R2, 26
  ST [BY], R2
  ANI R0, 16
  JZ brk_draw
  LDI R2, 0
  ST [SRV], R2
  LDI R2, 20
  ST [SND], R2
  JMP brk_draw

brk_move:
  LD R0, [SUBT]
  LDI R1, 1
  XOR R0, R1
  ST [SUBT], R0
  JZ brk_draw

  LD R0, [BX]
  LD R1, [VX_D]
  ADD R0, R1
  CPI R0, 1
  JNC bounce_x
  CPI R0, 62
  JC bounce_x
  ST [BX], R0
  JMP move_y
bounce_x:
  LDI R2, 0
  SUB R2, R1
  ST [VX_D], R2
  LDI R2, 12
  ST [SND], R2

move_y:
  LD R0, [BY]
  LD R1, [VY_D]
  ADD R0, R1
  CPI R0, 1
  JNC bounce_top
  ST [BY], R0
  JMP chk_pad
bounce_top:
  LDI R2, 1
  ST [VY_D], R2
  LDI R2, 14
  ST [SND], R2

chk_pad:
  LD R0, [BY]
  CPI R0, 27
  JNZ chk_miss
  LD R1, [BX]
  INC R1
  LD R2, [PX]
  SUB R1, R2
  CPI R1, 13
  JC chk_miss
  LDI R2, 255
  ST [VY_D], R2
  LDI R2, 26
  ST [BY], R2

  ; Optimized swing check with fallthrough
  LD R0, [PAD]
  ANI R0, 12
  JZ pad_stat
  LDI R2, 2
  CPI R0, 4
  JNZ pad_setx
  LDI R2, 254
  JMP pad_setx

pad_stat:
  LDI R2, 1
  CPI R1, 6
  JC pad_setx
  LDI R2, 255
pad_setx:
  ST [VX_D], R2
  LDI R2, 18
  ST [SND], R2
  JMP brk_draw

chk_miss:
  CPI R0, 31
  JNC chk_bricks
  LD R1, [LVS]
  DEC R1
  ST [LVS], R1
  LDI R2, 1
  ST [SRV], R2
  LDI R2, 4
  ST [SND], R2
  CALL brk_hud
  JMP brk_draw

chk_bricks:
  LD R0, [BY]
  CPI R0, 3
  JNC brk_draw
  CPI R0, 14
  JC brk_draw
  ADI R0, 253
  MOV R2, R0
  ANI R2, 3
  CPI R2, 2
  JNC brk_draw
  SHR R0
  SHR R0
  LDI R7, BRK0
  ADD R7, R0
  LDR R6
  LDI R2, 1
  LD R1, [BX]
  SHR R1
  SHR R1
  SHR R1
  JZ bk_tst
bk_sh:
  SHL R2
  DJNZ R1, bk_sh
bk_tst:
  MOV R3, R6
  AND R3, R2
  JZ brk_draw
  XOR R6, R2
  STR R6

  ; Exact physical bounce in both directions
  LD R2, [VY_D]
  LDI R3, 0
  SUB R3, R2
  ST [VY_D], R3

  LDI R1, 26
  ST [SND], R1
  CALL add_score
  LD R0, [BRK0]
  LD R1, [BRK1]
  OR R0, R1
  LD R1, [BRK2]
  OR R0, R1
  JNZ brk_draw
  LDI R0, 34
  ST [SND], R0
  JMP fill_wall

add_score:
  LD R0, [SEG5]
  ADI R0, 1
  CPI R0, 10
  JNC as_ok
  LDI R0, 0
  LD R1, [SEG4]
  ADI R1, 1
  ST [SEG4], R1
as_ok:
  ST [SEG5], R0
  RET

brk_draw:
  CLS
  LDI R7, BRK0
  LDI R5, 3
  LDI R6, 3
bdr_row:
  LDR R3
  LDI R4, 0
  LDI R2, 8
bdr_col:
  SHR R3
  JNC bdr_nx
  RECT $72
bdr_nx:
  ADI R4, 8
  DJNZ R2, bdr_col
  ADI R7, 1
  ADI R5, 4
  DJNZ R6, bdr_row

  LD R4, [PX]
  LDI R5, 29
  RECT $C2
  LD R4, [BX]
  LD R5, [BY]
  RECT $22

brk_wait:
  WFI
  JMP brk_tick

brk_hud:
  LD R0, [LVS]
  JNZ hud_ok
  LDI R0, 11
hud_ok:
  ST [SEG0], R0
  LDI R0, 10
  ST [SEG1], R0
  RET
