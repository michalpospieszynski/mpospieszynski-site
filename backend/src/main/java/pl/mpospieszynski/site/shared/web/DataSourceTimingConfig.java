package pl.mpospieszynski.site.shared.web;

import java.util.List;
import javax.sql.DataSource;
import net.ttddyy.dsproxy.ExecutionInfo;
import net.ttddyy.dsproxy.QueryInfo;
import net.ttddyy.dsproxy.listener.QueryExecutionListener;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wraps the DataSource so each statement's time is added to the current request's Server-Timing `db` entry. */
@Configuration
class DataSourceTimingConfig {

    @Bean
    static BeanPostProcessor dataSourceTimingProxy() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof DataSource dataSource && !(bean instanceof net.ttddyy.dsproxy.support.ProxyDataSource)) {
                    return ProxyDataSourceBuilder.create(dataSource).name("timed").listener(new TimingListener()).build();
                }
                return bean;
            }
        };
    }

    static final class TimingListener implements QueryExecutionListener {

        private static final ThreadLocal<Long> STARTED = new ThreadLocal<>();

        @Override
        public void beforeQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {
            STARTED.set(System.nanoTime());
        }

        @Override
        public void afterQuery(ExecutionInfo execInfo, List<QueryInfo> queryInfoList) {
            Long started = STARTED.get();
            STARTED.remove();
            if (started != null) {
                RequestTimings.addDatabaseTime(System.nanoTime() - started);
            }
        }
    }
}
