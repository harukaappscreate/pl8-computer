; ==============================================================================
; PL-8 Machine Code ROM 0: CALC-16 (16-bit 4-Function High-Precision Calculator)
; Architecture: PL-8 8-bit Microcomputer (16-bit Instruction Word)
; Author: haruka_apps
; Size: 251 words (502 bytes)
; Features:
;   - Full 16-bit BCD arithmetic: Add (+), Subtract (-), Multiply (*), Divide (/)
;   - Long division with automatic fraction rendering (e.g. 355 / 113 = 3.14)
;   - Negative sign support, decimal point formatting, division-by-zero detection
;   - 16-bit binary bar graph display & hex byte readout on 64x32 green LCD
; ==============================================================================
AL = $00
  AH = $01
  BL = $02
  BH = $03
  OP = $04
  ENT = $05
  NEG = $06
  LX = $07

  KEY = $F1
  SEG0 = $F2
  SEG1 = $F3
  SEG2 = $F4
  SEG3 = $F5
  SEG4 = $F6
  SEG5 = $F7
  SND = $FC
  BUSY = $FE

reset_all:
  CLS
  LDI R0, 0
  ST [BUSY], R0
  LDI R7, 8
clr_ram:
  DEC R7
  STR R0
  JNZ clr_ram
  CALL show_b

main_loop:
  WFI
  LD R6, [KEY]
  JZ main_loop
  LDI R0, 0
  ST [KEY], R0
  ANI R6, 15
  LDI R0, 18
  ST [SND], R0

  CPI R6, 15
  JZ reset_all
  CPI R6, 10
  JNC on_digit
  CPI R6, 14
  JZ on_eq

  LD R0, [BL]
  ST [AL], R0
  LD R0, [BH]
  ST [AH], R0
  ST [OP], R6
  LDI R0, 0
  ST [ENT], R0
  ST [NEG], R0
  CALL put_lcd
  JMP main_loop

on_digit:
  LD R0, [ENT]
  JNZ dig_append
  LD R0, [OP]
  JNZ dig_clear_b
  CLS
  ST [LX], R0
dig_clear_b:
  LDI R0, 0
  ST [BL], R0
  ST [BH], R0
  ST [NEG], R0
  INC R0
  ST [ENT], R0
dig_append:
  LD R1, [BH]
  CPI R1, 4
  JC main_loop
  LD R0, [BL]
  CALL mul10
  ADD R0, R6
  LDI R2, 0
  ADC R1, R2
  ST [BL], R0
  ST [BH], R1
  CALL put_lcd
  CALL show_b
  JMP main_loop

on_eq:
  LD R0, [OP]
  JZ main_loop
  LDI R6, 14
  CALL put_lcd
  MOV R5, R0
  LDI R0, 0
  ST [OP], R0
  ST [ENT], R0
  ST [NEG], R0
  INC R0
  ST [BUSY], R0

  LD R0, [AL]
  LD R1, [AH]
  LD R2, [BL]
  LD R3, [BH]

  CPI R5, 10
  JZ do_add
  CPI R5, 11
  JZ do_sub
  CPI R5, 12
  JZ do_mul

  MOV R4, R2
  OR R4, R3
  JZ div_err
  CALL div16
  ST [BL], R0
  ST [BH], R1
  MOV R6, R4
  OR R6, R5
  JZ eq_done_int
  CPI R1, 4
  JC eq_done_int
  CALL frac_step
  ST [SEG4], R0
  CALL frac_step
  ST [SEG5], R0
  CALL draw_bits
  LDI R7, SEG3
  CALL fmt_loop
  LD R0, [SEG3]
  ADI R0, $80
  ST [SEG3], R0
  JMP finish_eq

frac_step:
  MOV R0, R4
  MOV R1, R5
  CALL mul10
  JMP div16

div_err:
  LDI R7, SEG5
  LDI R0, 11
err_lp1:
  STR R0
  DEC R7
  CPI R7, 241
  JNZ err_lp1
  LDI R0, 3
  LDI R2, 6
  JMP set_stat

do_add:
  ADD R0, R2
  ADC R1, R3
  JC div_err
  JMP store_res

do_sub:
  SUB R0, R2
  SBC R1, R3
  JC store_res
  LDI R2, 0
  LDI R3, 0
  SUB R2, R0
  SBC R3, R1
  MOV R0, R2
  MOV R1, R3
  LDI R4, 1
  ST [NEG], R4
  JMP store_res

do_mul:
  MOV R4, R0
  MOV R5, R1
  LDI R0, 0
  LDI R1, 0
  LDI R6, 16
mul_lp:
  SHR R3
  ROR R2
  JNC mul_sk
  ADD R0, R4
  ADC R1, R5
  JC div_err
mul_sk:
  SHL R4
  ROL R5
  DJNZ R6, mul_lp

store_res:
  ST [BL], R0
  ST [BH], R1
eq_done_int:
  CALL show_b
finish_eq:
  LDI R0, 0
  LDI R2, 26
set_stat:
  ST [BUSY], R0
  ST [SND], R2
  JMP main_loop

mul10:
  SHL R0
  ROL R1
  MOV R4, R0
  MOV R5, R1
  SHL R0
  ROL R1
  SHL R0
  ROL R1
  ADD R0, R4
  ADC R1, R5
  RET

div16:
  LDI R4, 0
  LDI R5, 0
  LDI R6, 16
dv_lp:
  SHL R0
  ROL R1
  ROL R4
  ROL R5
  CMP R5, R3
  JNZ dv_c
  CMP R4, R2
dv_c:
  JNC dv_no
  SUB R4, R2
  SBC R5, R3
  INC R0
dv_no:
  DJNZ R6, dv_lp
  RET

show_b:
  CALL draw_bits
  LDI R7, SEG5
fmt_loop:
  LDI R2, 10
  LDI R3, 0
  CALL div16
  STR R4
  CPI R7, SEG0
  JZ fmt_end
  DEC R7
  MOV R4, R0
  OR R4, R1
  JNZ fmt_loop
  LD R4, [NEG]
  JZ fmt_bl
  LDI R4, 10
  STR R4
  LDI R4, 0
  ST [NEG], R4
  CPI R7, SEG0
  JZ fmt_end
  DEC R7
fmt_bl:
  LDI R4, 15
fmt_bllp:
  STR R4
  DEC R7
  CPI R7, 241
  JNZ fmt_bllp
fmt_end:
  RET

put_lcd:
  LD R4, [LX]
  CPI R4, 57
  JC put_ret
  LDI R5, 1
  PUTC R6
  ST [LX], R4
put_ret:
  RET

draw_bits:
  LDI R4, 0
  LDI R5, 11
  CLR
  LD R0, [BL]
  LD R1, [BH]
  LDI R4, 16
  LDI R5, 12
  MOV R7, R1
  CALL hex_byte
  MOV R7, R0
  CALL hex_byte
  LDI R4, 0
  LDI R6, 16
db_lp:
  LDI R5, 28
  SHL R0
  ROL R1
  JNC db_zero
  LDI R5, 22
  RECT $37
  JMP db_nx
db_zero:
  RECT $31
db_nx:
  ADI R4, 4
  DJNZ R6, db_lp
  LD R0, [BL]
  LD R1, [BH]
  RET

hex_byte:
  MOV R6, R7
  SHR R6
  SHR R6
  SHR R6
  SHR R6
  CALL hex_nib
  MOV R6, R7
  ANI R6, 15
hex_nib:
  CPI R6, 10
  JNC hn_ok
  ADI R6, 6
hn_ok:
  PUTC R6
  RET
