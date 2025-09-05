~VERSION INFORMATION
 VERS.                          2.0 :   CWLS LOG ASCII STANDARD -VERSION 2.0
 WRAP.                          NO  :   ONE LINE PER DEPTH STEP
~WELL INFORMATION 
#MNEM.UNIT              DATA                       DESCRIPTION
#----- -----            ----------               -------------------------
STRT    .M              8500.00                 :START DEPTH
STOP    .M              8600.00                 :STOP DEPTH
STEP    .M              0.1524                  :STEP 
NULL    .               -999.25                 :NULL VALUE
COMP    .               OFFSHORE DRILLING CO    :COMPANY
WELL    .               OFFSHORE-03             :WELL
FLD     .               GULF FIELD              :FIELD
LOC     .               OFFSHORE BLOCK 123      :LOCATION
PROV    .               GULF OF MEXICO          :PROVINCE 
SRVC    .               LOGGING SERVICES INC    :SERVICE COMPANY
DATE    .               13-DEC-1995             :LOG DATE
UWI     .               100123456789            :UNIQUE WELL ID
~CURVE INFORMATION
#MNEM.UNIT              API CODES                 DESCRIPTION
#----------             ------------              -------------------------
 DEPT   .M                                       :  1  DEPTH
 GR     .GAPI            45 310 01 00             :  2  GAMMA RAY
 NPHI   .V/V             45 890 00 00             :  3  NEUTRON POROSITY
 RHOB   .G/C3            45 350 02 00             :  4  BULK DENSITY
 RT     .OHMM            45 120 00 00             :  5  RESISTIVITY
~PARAMETER INFORMATION
#MNEM.UNIT              VALUE             DESCRIPTION
#----------             --------          -------------------------
 MUD    .               WBM               :MUD TYPE
 BHT    .DEGC           65.5              :BOTTOM HOLE TEMPERATURE
 BS     .MM             200.0             :BIT SIZE
 FD     .K/M3           1200.0            :FLUID DENSITY
 MATR   .               SANDSTONE         :FORMATION MATRIX
 MDEN   .               2650.0            :MATRIX DENSITY
 RMF    .OHMM           0.216             :MUD FILTRATE RESISTIVITY
 DFD    .K/M3           1525.0            :DRILLING FLUID DENSITY
~OTHER
     Note: The logging tools became stuck at 8595.5 meters, and the data
     below that depth is of questionable quality.
~A  DEPTH     GR   NPHI   RHOB    RT
8500.00    45.45  0.25   2.550   75.00
8500.15    46.12  0.24   2.565   74.25
8500.30    47.88  0.26   2.540   76.50