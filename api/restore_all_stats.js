
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const html = `
            <tr>
              <td>Adil Nawaz</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Medium</td><td>-</td><td>1</td><td>7</td><td>1</td><td>0</td><td>116.67</td><td>7</td><td>7</td><td>1</td><td>0</td><td>29</td><td>1</td><td>0</td><td>29</td><td>undefined</td><td>0/0</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Ajesh VS</td><td>Wicket Keeper</td><td>Right Handed</td><td>Right-Arm Spin</td><td>3</td><td>37</td><td>741</td><td>33</td><td>4</td><td>124.96</td><td>25.55</td><td>88</td><td>95</td><td>22</td><td>70</td><td>3</td><td>1</td><td>1.89</td><td>undefined</td><td>1/28</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Akhil Raju</td><td>Bowler</td><td>Right Handed</td><td>None</td><td>-</td><td>12</td><td>31</td><td>5</td><td>3</td><td>124</td><td>15.5</td><td>30</td><td>2</td><td>2</td><td>274</td><td>9</td><td>7</td><td>22.83</td><td>undefined</td><td>3/16</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Amal G Pillai</td><td>Batsman</td><td>Right Handed</td><td>None</td><td>13</td><td>39</td><td>1318</td><td>38</td><td>2</td><td>125.05</td><td>36.61</td><td>108</td><td>132</td><td>61</td><td>1003</td><td>35</td><td>31</td><td>25.72</td><td>undefined</td><td>3/29</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Anas Ummer</td><td>Batsman</td><td>Right Handed</td><td>None</td><td>16</td><td>135</td><td>4250</td><td>135</td><td>9</td><td>125</td><td>33.73</td><td>168</td><td>430</td><td>202</td><td>204</td><td>14</td><td>4</td><td>1.51</td><td>undefined</td><td>2/6</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Anees Ahad</td><td>All-Rounder</td><td>Right Handed</td><td>Left-Arm Spin</td><td>10</td><td>206</td><td>531</td><td>104</td><td>43</td><td>124.94</td><td>8.7</td><td>42</td><td>67</td><td>5</td><td>6410</td><td>203</td><td>281</td><td>31.12</td><td>undefined</td><td>5/17</td><td>3</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Aneesh Ashokan</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Fast</td><td>23</td><td>166</td><td>4328</td><td>155</td><td>20</td><td>125.01</td><td>32.06</td><td>145</td><td>546</td><td>141</td><td>2891</td><td>102</td><td>85</td><td>17.42</td><td>undefined</td><td>6/16</td><td>3</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Bejoy Johnson</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Medium</td><td>79</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0/0</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Bibin Baby</td><td>Batsman</td><td>Right Handed</td><td>None</td><td>-</td><td>2</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>undefined</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Bibish Mohanan</td><td>Bowler</td><td>null</td><td>null</td><td>-</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>undefined</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Haridas Rajendran Sathi</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Fast</td><td>-</td><td>17</td><td>316</td><td>16</td><td>2</td><td>124.9</td><td>22.57</td><td>63</td><td>32</td><td>7</td><td>475</td><td>14</td><td>10</td><td>27.94</td><td>undefined</td><td>2/37</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Jackson James</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Fast</td><td>89</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0/0</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Junais Kizhepat</td><td>Wicket Keeper</td><td>Right Handed</td><td>None</td><td>-</td><td>63</td><td>1339</td><td>58</td><td>6</td><td>125.02</td><td>25.75</td><td>79</td><td>178</td><td>16</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0/0</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Mohammed Khalander</td><td>All-Rounder</td><td>null</td><td>null</td><td>-</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>undefined</td><td>undefined</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Nastar PuthenPurayil</td><td>Batsman</td><td>Right Handed</td><td>Right-Arm Medium</td><td>19</td><td>140</td><td>2309</td><td>115</td><td>25</td><td>125.01</td><td>25.66</td><td>78</td><td>231</td><td>82</td><td>1649</td><td>66</td><td>51</td><td>11.78</td><td>undefined</td><td>3/20</td><td>1</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Prasanth Padmanabhan</td><td>All-Rounder</td><td>Right Handed</td><td>None</td><td>18</td><td>98</td><td>2882</td><td>89</td><td>19</td><td>124.98</td><td>41.17</td><td>107</td><td>381</td><td>17</td><td>2962</td><td>98</td><td>97</td><td>30.22</td><td>undefined</td><td>4/14</td><td>1</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Qamruddin Ansari</td><td>All-Rounder</td><td>Right Handed</td><td>None</td><td>-</td><td>2</td><td>17</td><td>2</td><td>0</td><td>121.43</td><td>8.5</td><td>9</td><td>1</td><td>0</td><td>78</td><td>2</td><td>2</td><td>39</td><td>undefined</td><td>2/52</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Rabi Rasheed</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Medium</td><td>-</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>2</td><td>0</td><td>undefined</td><td>2/0</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Renjith S Nair</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Fast</td><td>5</td><td>87</td><td>1195</td><td>72</td><td>17</td><td>125</td><td>21.73</td><td>66</td><td>115</td><td>19</td><td>476</td><td>20</td><td>12</td><td>5.47</td><td>undefined</td><td>3/32</td><td>1</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Rony Mathen Thomas</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Medium</td><td>-</td><td>32</td><td>56</td><td>18</td><td>10</td><td>124.44</td><td>7</td><td>12</td><td>4</td><td>0</td><td>471</td><td>21</td><td>14</td><td>14.72</td><td>undefined</td><td>2/22</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Sebin Baby</td><td>Wicket Keeper</td><td>Right Handed</td><td>Right-Arm Medium</td><td>11</td><td>74</td><td>635</td><td>55</td><td>11</td><td>125</td><td>14.43</td><td>75</td><td>68</td><td>8</td><td>647</td><td>32</td><td>23</td><td>8.74</td><td>undefined</td><td>4/41</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Shaik Faizullah</td><td>Batsman</td><td>Right Handed</td><td>Right-Arm Spin</td><td>25</td><td>119</td><td>2216</td><td>100</td><td>14</td><td>124.99</td><td>25.77</td><td>84</td><td>273</td><td>16</td><td>1296</td><td>67</td><td>50</td><td>10.89</td><td>undefined</td><td>4/18</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Shehin Shihabudeen</td><td>Batsman</td><td>Right Handed</td><td>Right-Arm Fast</td><td>7</td><td>139</td><td>2694</td><td>120</td><td>20</td><td>125.01</td><td>26.94</td><td>105</td><td>244</td><td>49</td><td>1872</td><td>75</td><td>37</td><td>13.47</td><td>undefined</td><td>4/37</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Shybin Bose</td><td>All-Rounder</td><td>Left Handed</td><td>Right-Arm Medium</td><td>-</td><td>28</td><td>97</td><td>13</td><td>4</td><td>124.36</td><td>10.78</td><td>31</td><td>11</td><td>1</td><td>453</td><td>18</td><td>18</td><td>16.18</td><td>undefined</td><td>5/27</td><td>0</td><td>undefined</td>
            </tr>
          
            <tr>
              <td>Sunil Anandan Kulai</td><td>All-Rounder</td><td>Right Handed</td><td>Right-Arm Spin</td><td>-</td><td>98</td><td>3560</td><td>96</td><td>12</td><td>125</td><td>42.38</td><td>144</td><td>420</td><td>107</td><td>1395</td><td>53</td><td>51</td><td>14.23</td><td>undefined</td><td>4/19</td><td>1</td><td>undefined</td>
            </tr>
`;

async function main() {
    const rows = html.match(/<tr>[\s\S]*?<\/tr>/g);
    for (const row of rows) {
        const cells = row.match(/<td>(.*?)<\/td>/g).map(c => c.replace(/<\/?td>/g, ''));
        const name = cells[0];
        const matches = parseInt(cells[5]) || 0;
        const runs = parseInt(cells[6]) || 0;
        const innings = parseInt(cells[7]) || 0;
        const no = parseInt(cells[8]) || 0;
        const sr = parseFloat(cells[9]) || 0;
        const avg = parseFloat(cells[10]) || 0;
        const highest = parseInt(cells[11]) || 0;
        const fours = parseInt(cells[12]) || 0;
        const sixes = parseInt(cells[13]) || 0;
        const bowlRuns = parseInt(cells[14]) || 0;
        const bowlInns = parseInt(cells[15]) || 0;
        const wickets = parseInt(cells[16]) || 0;
        const economy = parseFloat(cells[17]) || 0;
        const bestBowling = cells[19];
        const maidens = parseInt(cells[20]) || 0;

        console.log(`Resetting All Stats for ${name}...`);

        const { data: p } = await supabase.from('players').select('id').eq('name', name).single();
        if (!p) continue;

        // Create the Historical Baseline record with ALL stats mapped
        await supabase.from('player_match_stats').upsert([{
            match_id: '00000000-0000-0000-0000-000000000000',
            player_id: p.id,
            runs: runs,
            wickets: wickets,
            fours: fours,
            sixes: sixes,
            runs_conceded: bowlRuns,
            maidens: maidens,
            status: `HISTORICAL:${matches}`
        }], { onConflict: 'match_id, player_id' });

        // Update Career Statistics
        await supabase.from('players').update({
            runs_scored: runs,
            wickets_taken: wickets,
            matches_played: matches,
            batting_stats: {
                matches,
                innings,
                runs,
                fours,
                sixes,
                notOuts: no,
                average: avg,
                strikeRate: sr,
                highestScore: String(highest)
            },
            bowling_stats: {
                matches,
                innings: bowlInns,
                runs: bowlRuns,
                wickets,
                economy,
                bestBowling,
                maidens
            }
        }).eq('id', p.id);
    }
    console.log('--- ALL STATS RESTORED ---');
}

main();
