library ieee;

use ieee.std_logic_1164.all;

entity demo is
  generic (
    WIDTH : integer := 8
  );
  port (
    Clk    : in  std_logic;
    Rst    : in  std_logic;
    iData  : in  std_logic_vector(WIDTH-1 downto 0);
    oData  : out std_logic_vector(WIDTH-1 downto 0);
    oValid : out std_logic
  );
end entity demo;

architecture rtl of demo is
  signal count    : integer range 0 to WIDTH := 0;
  signal current  : std_logic_vector(WIDTH-1 downto 0);
  signal state    : integer;
  constant ALL_ONES : std_logic_vector(WIDTH-1 downto 0) := (others => '1');
begin

  process (Clk) is
    variable tmp : integer;
  begin
    if rising_edge(Clk) then
      if Rst = '1' then
        count   <= 0;
        current <= (others => '0');
        oValid  <= '0';
      else
        tmp := count + 1;

        if tmp >= WIDTH then
          count <= 0;
        elsif tmp /= 0 then
          count <= tmp;
        end if;

        if count <= WIDTH/2 then
          current <= iData;
        end if;

        oValid <= '1';
      end if;
    end if;
  end process;

  oData <= current when state = 0 else ALL_ONES;

  with state select
    current <= iData    when 0,
             ALL_ONES when 1,
             (others => '0') when others;

  process (state, iData) is
  begin
    case state is
      when 0      => current <= iData;
      when 1      => current <= ALL_ONES;
      when others => current <= (others => '0');
    end case;
  end process;

end architecture rtl;
