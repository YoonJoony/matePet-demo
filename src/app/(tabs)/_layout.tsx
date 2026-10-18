import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';

import { FloatingTabBar, tabItems } from '@/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <FloatingTabBar />
      {/* 탭 경로 선언용. 화면에는 FloatingTabBar가 대신 그려진다. */}
      <TabList style={{ display: 'none' }}>
        {tabItems.map((item) => (
          <TabTrigger key={item.name} name={item.name} href={item.href} />
        ))}
      </TabList>
    </Tabs>
  );
}
